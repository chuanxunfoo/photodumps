/**
 * Apple / Google sign-in (browser OAuth only). Supabase: Authentication → Providers (enable Apple, Google).
 * Authentication → URL Configuration → add this app’s redirect URI (from getAuthRedirectUri()
 * in a dev build, often exp://… or dumpit://auth-callback). Set app scheme in app.json / app.config.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { connectGmailAccount } from '../_lib/gmailConnect';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

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

/** OAuth / magic-link / password-reset redirect (via expo-linking, matches your app scheme). */
export function getAuthRedirectUri(): string {
  return Linking.createURL('auth-callback');
}

export function getResetPasswordRedirectUri(): string {
  // Keep recovery redirects on the existing callback route, then route to /reset-password in-app.
  return Linking.createURL('auth-callback');
}

export async function createSessionFromUrl(url: string) {
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
  // PKCE: authorization code on the redirect URL
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw error;
    return data.session;
  }
  return null;
}

async function signInWithOAuthProvider(
  provider: 'google' | 'apple',
  options?: { scopes?: string; queryParams?: Record<string, string> },
) {
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

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    preferEphemeralSession: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success' || !result.url) return null;

  return createSessionFromUrl(result.url);
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

/** Gmail-only OAuth (separate from Supabase login). Returns ok/error. */
export async function reconnectGoogleWithGmailScopes() {
  const res = await connectGmailAccount();
  if (!res.ok) throw new Error(res.error);
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Apple via Supabase OAuth in the system browser (no expo-crypto / expo-apple-authentication). */
export async function signInWithApple() {
  return signInWithOAuthProvider('apple');
}
