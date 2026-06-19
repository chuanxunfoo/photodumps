import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { UserProfile } from '../(tabs)/ThemeContext';
import { SUPABASE_APPLE_SETUP_HINT } from './appleAuthConstants';
import { ensureProfileRow } from './profilePlanSupabase';
import { supabase } from '../(tabs)/supabase';

export async function persistSessionUser(
  session: Session,
  setUser: (u: UserProfile | null) => void | Promise<void>,
): Promise<UserProfile> {
  const u = session.user;
  const meta = u.user_metadata as { username?: string; full_name?: string } | undefined;
  const uname =
    (typeof meta?.username === 'string' && meta.username) ||
    (typeof meta?.full_name === 'string' && meta.full_name.split(' ')[0]) ||
    u.email?.split('@')[0] ||
    'user';

  let profileError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await ensureProfileRow({
        userId: u.id,
        email: u.email ?? '',
        username: uname,
        fullName: typeof meta?.full_name === 'string' ? meta.full_name : undefined,
        planType: 'hobby',
      });
      profileError = undefined;
      break;
    } catch (e) {
      profileError = e;
      console.warn(`[auth] ensureProfileRow attempt ${attempt + 1} failed`, e);
    }
  }
  if (profileError) {
    console.warn('[auth] profile sync failed after retries; session remains valid', profileError);
  }

  const profile: UserProfile = {
    uid: u.id,
    email: u.email ?? '',
    username: uname,
    isLoggedIn: true,
  };

  await setUser(profile);
  await AsyncStorage.setItem('@dumpit_signed_once', '1');
  try {
    await syncPendingAppleSubscriptionOnSignIn(u.id);
  } catch (e) {
    console.warn('[auth] pending subscription sync failed', e);
  }
  return profile;
}

export async function signInWithAppleAccount(
  setUser: (u: UserProfile | null) => void | Promise<void>,
): Promise<UserProfile | null> {
  try {
    const { signInWithAppleNative } = await import('./appleAuthNative');
    const session = await signInWithAppleNative();
    if (!session) return null;
    await AsyncStorage.setItem('@dumpit_signed_once', '1');
    return persistSessionUser(session, setUser);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

export async function signInWithGoogleAccount(
  setUser: (u: UserProfile | null) => void | Promise<void>,
): Promise<UserProfile | null> {
  const { signInWithGoogle } = await import('../(tabs)/authOAuth');
  const session = await signInWithGoogle();
  if (!session) return null;
  return persistSessionUser(session, setUser);
}

export async function signOutAccount(
  setUser: (u: UserProfile | null) => void | Promise<void>,
): Promise<void> {
  await supabase.auth.signOut();
  await setUser(null);
}

const APPLE_PRIVATE_RELAY = '@privaterelay.appleid.com';

/** Signed-in alert body — hides confusing Apple Hide My Email relay addresses. */
export function formatSignedInMessage(
  email: string | undefined | null,
  labels: { withEmail: string; withAppleId: string },
): string {
  if (!email || email.includes(APPLE_PRIVATE_RELAY)) {
    return labels.withAppleId;
  }
  return labels.withEmail.replace('{email}', email);
}

/** Hub account sign-in — Generals → account, or direct route from paywall. */
export function navigateToAccountSignIn(): void {
  router.push({ pathname: '/account-sign-in', params: { from: 'generals' } });
}

/** User-friendly auth prompt with a one-tap path to the account screen. */
export function showGoToAccountAlert(
  title: string,
  message: string,
  options?: { cancelText?: string },
): void {
  Alert.alert(title, message, [
    { text: options?.cancelText ?? 'Not now', style: 'cancel' },
    { text: 'Go to Account', onPress: navigateToAccountSignIn },
  ]);
}

/** After a successful App Store purchase when optional sign-in fails. */
export function showPostPurchaseSignInAlert(err: unknown): void {
  showGoToAccountAlert(
    'Sign in to save Pro',
    `${formatAuthError(err)}\n\nYour App Store purchase succeeded. Sign in with Apple to sync Pro across devices.`,
  );
}

/** Optional nudge after guest IAP — never blocks Pro access. */
export function showOptionalSignInAfterProPurchase(): void {
  showGoToAccountAlert(
    "You're on Pro!",
    'Sign in with Apple to sync Pro across devices and back up your settings. You can also do this anytime under Account.',
    { cancelText: 'Later' },
  );
}

/** Push locally stored Apple subscription to Supabase after the user signs in. */
export async function syncPendingAppleSubscriptionOnSignIn(userId: string): Promise<void> {
  const { readLocalSubscriptionMeta } = await import('./subscriptionLocal');
  const local = await readLocalSubscriptionMeta();
  if (!local.planId) return;

  const { recordSubscriptionActivation } = await import('./billingSupabase');
  await recordSubscriptionActivation({
    userId,
    planId: local.planId,
    provider: 'apple',
    status: 'active',
    periodEndMs: local.periodEndMs ?? undefined,
  });
}

export function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Property '.*' doesn't exist|is not defined|undefined is not an object/i.test(msg)) {
    return 'Something went wrong. Open Account and tap Sign in with Apple to try again.';
  }
  if (/unable to exchange external code|exchange.*code|invalid flow state|code verifier/i.test(msg)) {
    return 'Sign-in was interrupted. Close photodumps completely, reopen it, and try again.';
  }
  if (/sign.?up not completed|signup not completed/i.test(msg)) {
    return "Apple couldn't verify your account. Trying again usually works — or update to the latest TestFlight build.";
  }
  if (/unacceptable audience|invalid claim|id_token|jwt|token.*invalid|rejected the Apple token/i.test(msg)) {
    return msg.includes('Supabase') ? msg : `${msg}\n\n${SUPABASE_APPLE_SETUP_HINT}`;
  }
  if (/unsupported provider|provider is not enabled|validation_failed|disabled in Supabase/i.test(msg)) {
    return msg.includes('Supabase') ? msg : `Apple sign-in is not enabled in Supabase. ${SUPABASE_APPLE_SETUP_HINT}`;
  }
  if (/Network request failed|Failed to fetch|invalid\.supabase\.co/i.test(msg)) {
    return 'Cannot reach Supabase. Check your network and try again.';
  }
  if (/database error saving new user|error saving new user/i.test(msg)) {
    return 'Could not create your account on the server. Try again in a minute — if it keeps failing, contact support.';
  }
  if (/Expo Go|storeClient/i.test(msg)) {
    return 'Sign in with Apple is not available in Expo Go. Install photodumps from TestFlight.';
  }
  if (/not available|UnavailabilityError|native module is missing|unavailable in this build/i.test(msg)) {
    return msg.includes('TestFlight') || msg.includes('build')
      ? msg
      : 'Apple Sign In failed on this device. Force-quit photodumps, reopen it, and try again.';
  }
  return msg;
}
