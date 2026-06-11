import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import type { UserProfile } from '../(tabs)/ThemeContext';
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

  await ensureProfileRow({
    userId: u.id,
    email: u.email ?? '',
    username: uname,
    fullName: typeof meta?.full_name === 'string' ? meta.full_name : undefined,
    planType: 'hobby',
  }).catch(() => undefined);

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
    return 'Sign-in was interrupted. Close photodumps completely, reopen it, and try again in one step.';
  }
  if (/sign.?up not completed|signup not completed/i.test(msg)) {
    return 'Apple could not finish sign-in. Update to the latest TestFlight build (native Sign in with Apple), then try again from Generals → account.';
  }
  if (/unacceptable audience|invalid claim|id_token|jwt|token.*invalid/i.test(msg)) {
    return 'Apple sign-in is misconfigured in Supabase. Under Authentication → Providers → Apple, set the iOS bundle ID to com.yourname.dumpitapp, then try again.';
  }
  if (/unsupported provider|provider is not enabled|validation_failed/i.test(msg)) {
    return 'Apple sign-in is not enabled in Supabase. Enable Apple under Authentication → Providers and add dumpit://auth-callback as a redirect URL.';
  }
  if (/Network request failed|Failed to fetch|invalid\.supabase\.co/i.test(msg)) {
    return 'Cannot reach Supabase. Check your network and app configuration, then try again.';
  }
  return msg;
}
