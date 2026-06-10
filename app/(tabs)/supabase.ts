import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// ─── HARDCODED FALLBACK CREDENTIALS ──────────────────────────────────
// These are your real Supabase credentials. app.config.js passes them
// via Constants.expoConfig.extra, but we also keep them here as a
// belt-and-suspenders fallback so the app never fails to connect due
// to Metro env-var timing issues.
const HARDCODED_URL = 'https://ozuaijxdifqnbuavuelm.supabase.co';
const HARDCODED_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dWFpanhkaWZxbmJ1YXZ1ZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTQ3NDYsImV4cCI6MjA5NDAzMDc0Nn0.U70QIy0_joSCxYKT-LB3eUMJKQR9NvJ8YZsT3aYhiy0';

function stripEnv(v: string | undefined): string {
  return (v ?? '').replace(/\r/g, '').trim();
}

const extra = Constants.expoConfig?.extra as
  | { EXPO_PUBLIC_SUPABASE_URL?: string; EXPO_PUBLIC_SUPABASE_ANON_KEY?: string }
  | undefined;

// Prefer app.config.js extra → process.env → hardcoded fallback
const envUrl = stripEnv(
  extra?.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  HARDCODED_URL,
);
const envKey = stripEnv(
  extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  HARDCODED_KEY,
);

/** True when pointing at a real Supabase project (not a placeholder). */
export function isSupabaseConfigured(): boolean {
  if (!envUrl || !envKey) return false;
  if (envUrl.includes('your-project-id') || envUrl.includes('invalid.supabase')) return false;
  try {
    const u = new URL(envUrl);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

const supabaseUrl = isSupabaseConfigured() ? envUrl : HARDCODED_URL;
const supabaseAnonKey = isSupabaseConfigured() ? envKey : HARDCODED_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInBroadcast: false,
    flowType: 'pkce',
  },
});

const SESSION_READ_TIMEOUT_MS = 4000;

/** Reads the local session without letting network block the UI indefinitely. */
export async function getSessionSafe(): Promise<Session | null> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), SESSION_READ_TIMEOUT_MS),
      ),
    ]);
    return result.data.session;
  } catch {
    return null;
  }
}

/** Explore → Rate photodumps: mood 0–1 + optional comment (requires `app_ratings` table + RLS). */
export async function submitAppRating(payload: {
  rating: number;
  comment: string | null;
  platform: string;
  appVersion: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('app_ratings').insert({
      rating: payload.rating,
      comment: payload.comment,
      platform: payload.platform,
      app_version: payload.appVersion,
      user_id: session?.user?.id ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
