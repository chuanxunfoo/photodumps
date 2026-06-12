import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

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

export function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
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
  if (/not available on ios|UnavailabilityError|native module is missing|Expo Go/i.test(msg)) {
    return 'Apple Sign In needs the latest TestFlight build — not Expo Go. Install build 41+ from TestFlight.';
  }
  return msg;
}
