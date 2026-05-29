import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../(tabs)/supabase';

const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

import {
  markGmailDetoxReady,
  markOAuthRedirectStarted,
  type GmailPendingAction,
} from './gmailDetoxSetup';

const AFTER_OAUTH_KEY = 'gmail_detox_after_oauth';

type Extra = {
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GMAIL_OAUTH_REDIRECT_URI?: string;
};

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

function getGoogleWebClientId(): string {
  const id = (readExtra().EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
  if (!id) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Add your Google OAuth Web Client ID to app/.env and restart Expo.',
    );
  }
  return id;
}

function getGoogleIosClientId(): string {
  return (readExtra().EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
}

function iosRedirectUriFromClientId(iosClientId: string): string {
  const idPart = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${idPart}:/oauthredirect`;
}

function getSupabaseProjectUrl(): string {
  const extra = Constants.expoConfig?.extra as { EXPO_PUBLIC_SUPABASE_URL?: string } | undefined;
  const url = (
    extra?.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    'https://ozuaijxdifqnbuavuelm.supabase.co'
  ).trim();
  return url.replace(/\/$/, '');
}

export function getDefaultGmailOAuthRedirectUri(): string {
  return `${getSupabaseProjectUrl()}/functions/v1/gmail-oauth-redirect`;
}

export function getWebGmailRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const port = window.location.port || '8081';
    const host = window.location.hostname === '127.0.0.1' ? 'localhost' : window.location.hostname;
    return `http://${host}${port ? `:${port}` : ''}/gmail-callback`;
  }
  return 'http://localhost:8081/gmail-callback';
}

function getWebRedirectUri(): string {
  return getWebGmailRedirectUri();
}

export function getGmailRedirectUri(): string {
  if (Platform.OS === 'web') {
    return getWebRedirectUri();
  }

  const httpsRedirect = (
    readExtra().EXPO_PUBLIC_GMAIL_OAUTH_REDIRECT_URI ??
    process.env.EXPO_PUBLIC_GMAIL_OAUTH_REDIRECT_URI ??
    ''
  ).trim();
  if (httpsRedirect) return httpsRedirect;

  if (Platform.OS === 'ios') {
    const iosClientId = getGoogleIosClientId();
    if (iosClientId) return iosRedirectUriFromClientId(iosClientId);
  }

  return getDefaultGmailOAuthRedirectUri();
}

function isAllowedRedirectUri(uri: string): boolean {
  if (uri.startsWith('https://')) return true;
  if (uri.startsWith('com.googleusercontent.apps.')) return true;
  if (/^http:\/\/localhost(:\d+)?\//.test(uri)) return true;
  return false;
}

function getOAuthClientConfig(): { clientId: string; redirectUri: string } {
  const redirectUri = getGmailRedirectUri();

  if (Platform.OS === 'ios') {
    const iosClientId = getGoogleIosClientId();
    if (iosClientId && redirectUri.startsWith('com.googleusercontent.apps.')) {
      return { clientId: iosClientId, redirectUri };
    }
  }

  const webClientId = getGoogleWebClientId();
  if (!isAllowedRedirectUri(redirectUri)) {
    throw new Error(
      'Gmail connect needs a registered redirect URI. Add these in Google Cloud → Web client → Authorized redirect URIs:\n' +
        `• ${getDefaultGmailOAuthRedirectUri()}\n` +
        '• http://localhost:8081/gmail-callback (for web preview)',
    );
  }

  return { clientId: webClientId, redirectUri };
}

export function markGmailOAuthResume(action: GmailPendingAction | 'rescan'): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(AFTER_OAUTH_KEY, action);
}

export function consumeGmailOAuthResume(): GmailPendingAction | 'rescan' | null {
  if (typeof sessionStorage === 'undefined') return null;
  const v = sessionStorage.getItem(AFTER_OAUTH_KEY);
  sessionStorage.removeItem(AFTER_OAUTH_KEY);
  if (v === 'scan' || v === 'clean' || v === 'rescan') return v;
  return null;
}

export async function exchangeGmailOAuthCode(
  code: string,
  redirectUri: string,
): Promise<{ ok: true; hasModify: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('gmail-oauth-exchange', {
    body: { code, redirectUri },
  });

  if (error) {
    let msg = error.message ?? 'Could not save Gmail connection.';
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) msg = body.error;
      } catch {
        /* ignore */
      }
    }
    return { ok: false, error: msg };
  }

  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { ok: false, error: String((data as { error: string }).error) };
  }

  const payload = (data ?? {}) as { hasModify?: boolean };
  const hasModify = Boolean(payload.hasModify);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (hasModify && userId) {
    await markGmailDetoxReady(userId);
  }

  return { ok: true, hasModify };
}

export async function hasGmailConnection(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from('gmail_oauth_tokens')
    .select('provider_refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.provider_refresh_token);
}

/** True when we believe delete is allowed — empty scopes = legacy row, try cleanup. */
export async function hasGmailModifyPermission(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from('gmail_oauth_tokens')
    .select('provider_refresh_token, scopes')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.provider_refresh_token) return false;
  const scopes = String(data.scopes ?? '').trim();
  if (!scopes) return true;
  if (scopes.includes('gmail.modify')) return true;
  return !scopes.includes('gmail.readonly');
}

export async function connectGmailAccount(
  opts?: { promptConsent?: boolean },
): Promise<{ ok: true; hasModify: boolean } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: 'Sign in to your photodumps account first, then connect Gmail.' };
  }

  let clientId: string;
  let redirectUri: string;
  try {
    ({ clientId, redirectUri } = getOAuthClientConfig());
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    sessionStorage.setItem('gmail_oauth_redirect_uri', redirectUri);
    markOAuthRedirectStarted();
    window.location.assign(authUrl);
    return { ok: false, error: 'Redirecting to Google…' };
  }

  const returnUrl = redirectUri.startsWith('https://')
    ? redirectUri
    : Linking.createURL('gmail-callback');

  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl, {
    preferEphemeralSession: false,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, error: 'Gmail connection was cancelled.' };
  }
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Gmail connection did not complete.' };
  }

  const parsed = Linking.parse(result.url);
  const q = parsed.queryParams ?? {};
  const code = typeof q.code === 'string' ? q.code : null;
  if (!code) {
    const err = typeof q.error_description === 'string'
      ? q.error_description
      : typeof q.error === 'string'
        ? q.error
        : 'No authorization code returned from Google.';
    return { ok: false, error: err };
  }

  return exchangeGmailOAuthCode(code, redirectUri);
}
