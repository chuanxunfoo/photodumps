import type { Session } from '@supabase/supabase-js';

import { appleAuthUnavailableReason, isNativeAppleAuthLinked } from './appleAuthAvailability';
import { IOS_APP_BUNDLE_ID } from './appleAuthConstants';
import { createAppleNonce } from './appleNonce';
import { supabase } from '../(tabs)/supabase';

export type AppleCredential = {
  identityToken: string | null;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
};

let signInFlight: Promise<{ credential: AppleCredential; rawNonce: string }> | null = null;

/**
 * Native Apple sheet only — throws if ExpoAppleAuthentication is not in the binary.
 */
export async function presentAppleSignInSheet(): Promise<{
  credential: AppleCredential;
  rawNonce: string;
}> {
  if (!isNativeAppleAuthLinked()) {
    throw new Error(appleAuthUnavailableReason() ?? 'Apple Sign In is not available on this device.');
  }

  if (signInFlight) return signInFlight;

  signInFlight = (async () => {
    const AppleAuthentication = await import('expo-apple-authentication');
    const { rawNonce, hashedNonce } = createAppleNonce();
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return a sign-in token. Try again.');
    }
    return { credential, rawNonce };
  })().finally(() => {
    signInFlight = null;
  });

  return signInFlight;
}

async function exchangeAppleToken(identityToken: string, rawNonce: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) {
    const msg = error.message ?? 'Apple sign-in failed.';
    if (/unacceptable audience|invalid claim|audience/i.test(msg)) {
      throw new Error(
        `Supabase rejected the Apple token. Add "${IOS_APP_BUNDLE_ID}" under Authentication → Providers → Apple → Client IDs.`,
      );
    }
    if (/provider is not enabled|unsupported provider/i.test(msg)) {
      throw new Error('Apple sign-in is disabled in Supabase. Enable the Apple provider first.');
    }
    throw error;
  }

  if (!data.session) {
    throw new Error('Supabase did not return a session after Apple sign-in.');
  }

  return data.session;
}

export async function sessionFromAppleCredential(
  credential: AppleCredential,
  rawNonce: string,
): Promise<Session> {
  if (!credential.identityToken) {
    throw new Error('Apple did not return a sign-in token.');
  }

  let session = await exchangeAppleToken(credential.identityToken, rawNonce);

  const given = credential.fullName?.givenName?.trim();
  const family = credential.fullName?.familyName?.trim();
  const fullName = [given, family].filter(Boolean).join(' ').trim();
  if (fullName) {
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          username: given ?? undefined,
        },
      });
      const { data: refreshed } = await supabase.auth.getSession();
      if (refreshed.session) session = refreshed.session;
    } catch (e) {
      console.warn('[apple] metadata update skipped', e);
    }
  }

  return session;
}

/** Native Apple sheet when available; otherwise Supabase OAuth in Safari. */
export async function signInWithAppleNative(): Promise<Session | null> {
  try {
    if (isNativeAppleAuthLinked()) {
      const { credential, rawNonce } = await presentAppleSignInSheet();
      return sessionFromAppleCredential(credential, rawNonce);
    }

    const { signInWithAppleOAuth } = await import('../(tabs)/authOAuth');
    return signInWithAppleOAuth();
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
