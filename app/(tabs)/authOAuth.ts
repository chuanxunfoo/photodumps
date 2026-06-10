/**
 * Apple / Google sign-in via Supabase OAuth in the system browser.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';

import { isNativeAppleSignInAvailable, signInWithAppleNative } from '../_lib/appleAuthNative';
import { OAUTH_BROWSER_ACTIVE_KEY } from '../_lib/appLaunchFlow';
import { connectGmailAccount } from '../_lib/gmailConnect';
import { ensureProfileRow } from '../_lib/profilePlanSupabase';

import { supabase } from './supabase';

const EXCHANGED_CODE_KEY = '@auth_oauth_exchanged_code/v1';
let exchangeLock: Promise<Session | null> | null = null;

export async function isOAuthBrowserSessionActive(): Promise<boolean> {
  return (await AsyncStorage.getItem(OAUTH_BROWSER_ACTIVE_KEY)) === '1';
}

async function setOAuthBrowserSessionActive(active: boolean): Promise<void> {
  if (active) await AsyncStorage.setItem(OAUTH_BROWSER_ACTIVE_KEY, '1');
  else await AsyncStorage.removeItem(OAUTH_BROWSER_ACTIVE_KEY);
}

/** Parse query + hash (OAuth tokens may live in the fragment). */
export function parseOAuthRedirectParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const ingest = (segment: string) => {
    const raw = segment.startsWith('?') || segment.startsWith('#') ? segment.slice(1) : segment;
    if (!raw) return;
    try {
      new URLSearchParams(raw).forEach((v, k) => {
        if (v !== undefined && v !== null) out[k] = String(v);
      });
    } catch {
      /* ignore malformed segments */
    }
  };
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const afterHash = hashIdx === -1 ? '' : url.slice(hashIdx);
  const qIdx = beforeHash.indexOf('?');
  if (qIdx !== -1) ingest(beforeHash.slice(qIdx));
  if (afterHash) ingest(afterHash);
  return out;
}

export function getAuthRedirectUri(): string {
  return Linking.createURL('auth-callback');
}

export function getResetPasswordRedirectUri(): string {
  return Linking.createURL('auth-callback');
}

async function readExchangedCode(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(EXCHANGED_CODE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string };
    return parsed.code ?? null;
  } catch {
    return null;
  }
}

async function markCodeExchanged(code: string): Promise<void> {
  await AsyncStorage.setItem(EXCHANGED_CODE_KEY, JSON.stringify({ code, at: Date.now() }));
}

async function sessionFromExistingAuth(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function createSessionFromUrlInner(url: string): Promise<Session | null> {
  const params = parseOAuthRedirectParams(url);
  if (params.error) {
    throw new Error(params.error_description || params.error || 'Sign-in was cancelled or failed.');
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  }

  if (params.code) {
    const code = decodeURIComponent(params.code);
    const used = await readExchangedCode();
    if (used === code) {
      return sessionFromExistingAuth();
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const retry = await supabase.auth.exchangeCodeForSession(url);
      if (retry.error) {
        const existing = await sessionFromExistingAuth();
        if (existing) return existing;
        throw retry.error;
      }
      await markCodeExchanged(code);
      return retry.data.session;
    }
    await markCodeExchanged(code);
    return data.session;
  }

  return sessionFromExistingAuth();
}

/** Serialize PKCE exchanges so WebBrowser + deep link cannot redeem the same code twice. */
export async function createSessionFromUrl(url: string): Promise<Session | null> {
  if (exchangeLock) {
    await exchangeLock.catch(() => null);
    return sessionFromExistingAuth();
  }
  exchangeLock = createSessionFromUrlInner(url).finally(() => {
    exchangeLock = null;
  });
  return exchangeLock;
}

export async function finalizeOAuthSession(session: Session): Promise<Session> {
  const u = session.user;
  const meta = u.user_metadata as { username?: string; full_name?: string } | undefined;
  const uname =
    (typeof meta?.username === 'string' && meta.username) ||
    (typeof meta?.full_name === 'string' && meta.full_name.split(' ')[0]) ||
    u.email?.split('@')[0] ||
    `user_${u.id.slice(0, 8)}`;

  try {
    await ensureProfileRow({
      userId: u.id,
      email: u.email ?? '',
      username: uname,
      fullName: typeof meta?.full_name === 'string' ? meta.full_name : undefined,
      planType: 'hobby',
    });
  } catch (e) {
    console.warn('[auth] profile sync skipped', e);
  }

  await AsyncStorage.setItem('@dumpit_signed_once', '1');
  return session;
}

async function signInWithOAuthProvider(
  provider: 'google' | 'apple',
  options?: { scopes?: string; queryParams?: Record<string, string> },
) {
  WebBrowser.maybeCompleteAuthSession();
  const redirectTo = getAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      scopes: options?.scopes,
      queryParams: options?.queryParams,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned. Enable the provider in Supabase (Authentication → Providers).');

  await setOAuthBrowserSessionActive(true);
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      preferEphemeralSession: false,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    if (result.type !== 'success' || !result.url) return null;

    const session = await createSessionFromUrl(result.url);
    if (!session) return null;
    return finalizeOAuthSession(session);
  } finally {
    await setOAuthBrowserSessionActive(false);
  }
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export async function reconnectGoogleWithGmailScopes() {
  const res = await connectGmailAccount();
  if (!res.ok) throw new Error(res.error);
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithApple() {
  if (Platform.OS === 'ios') {
    const nativeAvailable = await isNativeAppleSignInAvailable();
    if (!nativeAvailable) {
      throw new Error(
        'Sign in with Apple requires the latest photodumps build from TestFlight. Update the app and try again.',
      );
    }
    try {
      const session = await signInWithAppleNative();
      if (!session) return null;
      return finalizeOAuthSession(session);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return null;
      throw e;
    }
  }
  return signInWithOAuthProvider('apple');
}
