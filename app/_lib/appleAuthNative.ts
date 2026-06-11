import type { Session } from '@supabase/supabase-js';

import { IOS_APP_BUNDLE_ID } from './appleAuthConstants';
import { waitUntilNativeIdle } from './launchStability';
import { supabase } from '../(tabs)/supabase';

let signInFlight: Promise<Session | null> | null = null;

async function exchangeAppleToken(
  identityToken: string,
  rawNonce: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) {
    const msg = error.message ?? 'Apple sign-in failed.';
    if (/unacceptable audience|invalid claim|audience/i.test(msg)) {
      throw new Error(
        `Supabase rejected the Apple token. Add "${IOS_APP_BUNDLE_ID}" under Authentication → Providers → Apple → Client IDs, then try again.`,
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

async function signInWithAppleNativeImpl(): Promise<Session | null> {
  await waitUntilNativeIdle();

  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');
  const { Platform } = await import('react-native');

  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  let available = false;
  try {
    available = await AppleAuthentication.isAvailableAsync();
  } catch {
    available = false;
  }
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

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

/** Native Sign in with Apple — lazy-loads modules and single-flights concurrent taps. */
export async function signInWithAppleNative(): Promise<Session | null> {
  if (signInFlight) return signInFlight;
  signInFlight = signInWithAppleNativeImpl().finally(() => {
    signInFlight = null;
  });
  return signInFlight;
}

export async function isNativeAppleSignInAvailable(): Promise<boolean> {
  const { Platform } = await import('react-native');
  if (Platform.OS !== 'ios') return false;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
