import { supabase } from '../(tabs)/supabase';
import type { PlanType } from '../(tabs)/ThemeContext';

export type ProfilePlanType = 'hobby' | 'pro' | 'admin';

export type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  plan_type: ProfilePlanType;
  updated_at?: string;
};

export function normalizeProfilePlanType(raw: unknown): ProfilePlanType {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'pro' || v === 'admin' || v === 'hobby') return v;
  if (v === 'free') return 'hobby';
  return 'hobby';
}

export function profilePlanToAppPlan(plan: ProfilePlanType): PlanType {
  if (plan === 'admin') return 'admin';
  if (plan === 'pro') return 'pro';
  return 'hobby';
}

export function appPlanToProfilePlan(plan: PlanType): ProfilePlanType {
  if (plan === 'admin') return 'admin';
  if (plan === 'pro') return 'pro';
  return 'hobby';
}

export async function fetchProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, plan_type')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[profiles] fetch failed', error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    username: r.username != null ? String(r.username) : null,
    plan_type: normalizeProfilePlanType(r.plan_type),
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
  };
}

export async function ensureProfileRow(params: {
  userId: string;
  email: string;
  username: string;
  planType?: ProfilePlanType;
}): Promise<ProfileRow | null> {
  const existing = await fetchProfileByUserId(params.userId);
  if (existing) {
    if (!existing.email || existing.email !== params.email) {
      await supabase
        .from('profiles')
        .update({ email: params.email, username: params.username })
        .eq('id', params.userId);
    }
    return existing;
  }
  const plan = params.planType ?? 'hobby';
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: params.userId,
      email: params.email,
      username: params.username,
      plan_type: plan,
    })
    .select('id, email, username, plan_type')
    .single();
  if (error) {
    console.warn('[profiles] insert failed', error.message);
    return null;
  }
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    username: r.username != null ? String(r.username) : null,
    plan_type: normalizeProfilePlanType(r.plan_type),
  };
}

export async function updateProfilePlanType(userId: string, planType: ProfilePlanType): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan_type: planType })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: find profile by email (exact match, case-insensitive). */
export async function fetchProfileByEmail(email: string): Promise<ProfileRow | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, plan_type')
    .ilike('email', trimmed)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[profiles] fetch by email failed', error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    username: r.username != null ? String(r.username) : null,
    plan_type: normalizeProfilePlanType(r.plan_type),
  };
}

export async function adminSetPlanByEmail(
  email: string,
  planType: ProfilePlanType,
): Promise<{ ok: boolean; error?: string; profile?: ProfileRow }> {
  const row = await fetchProfileByEmail(email.trim());
  if (!row) {
    return { ok: false, error: 'No profile found for that email. User must sign in once first.' };
  }
  const res = await updateProfilePlanType(row.id, planType);
  if (!res.ok) return res;
  return { ok: true, profile: { ...row, plan_type: planType } };
}
