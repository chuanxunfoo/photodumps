import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../(tabs)/supabase';

export async function isNativeAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Native Sign in with Apple — avoids the appleid.apple.com web flow that shows "Sign-Up Not Completed". */
export async function signInWithAppleNative(): Promise<Session | null> {
  const available = await isNativeAppleSignInAvailable();
  if (!available) return null;

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

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;
  if (!data.session) return null;

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
    } catch (e) {
      console.warn('[apple] metadata update skipped', e);
    }
  }

  const { data: refreshed } = await supabase.auth.getSession();
  return refreshed.session ?? data.session;
}
