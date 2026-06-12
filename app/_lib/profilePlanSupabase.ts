import { supabase } from '../(tabs)/supabase';
import type { PlanType } from '../(tabs)/ThemeContext';

export type ProfilePlanType = 'hobby' | 'pro' | 'admin';

export type SubscriptionPlanInterval = 'weekly' | 'monthly' | 'yearly';

export type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  plan_type: ProfilePlanType;
  subscription_plan?: SubscriptionPlanInterval | null;
  subscription_ends_at?: string | null;
  updated_at?: string;
};

export type SubscriptionDetails = {
  plan: SubscriptionPlanInterval | null;
  periodEndMs: number | null;
};

function parseSubscriptionPlan(raw: unknown): SubscriptionPlanInterval | null {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'weekly' || v === 'monthly' || v === 'yearly') return v;
  return null;
}

export async function fetchSubscriptionDetails(userId: string): Promise<SubscriptionDetails> {
  const [{ data: prof }, { data: sub }] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_plan, subscription_ends_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan_type, current_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const plan =
    parseSubscriptionPlan(prof?.subscription_plan) ??
    parseSubscriptionPlan(sub?.plan_type);

  const endIso =
    (prof?.subscription_ends_at as string | null | undefined) ??
    (sub?.current_period_end as string | null | undefined) ??
    null;
  const periodEndMs = endIso ? Date.parse(endIso) : null;

  return {
    plan,
    periodEndMs: periodEndMs != null && Number.isFinite(periodEndMs) ? periodEndMs : null,
  };
}

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
    .select('id, email, username, plan_type, subscription_plan, subscription_ends_at')
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
    subscription_plan: parseSubscriptionPlan(r.subscription_plan),
    subscription_ends_at: r.subscription_ends_at != null ? String(r.subscription_ends_at) : null,
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
  };
}

function rowFromRpc(data: unknown): ProfileRow | null {
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    username: r.username != null ? String(r.username) : null,
    plan_type: normalizeProfilePlanType(r.plan_type),
    subscription_plan: parseSubscriptionPlan(r.subscription_plan),
    subscription_ends_at: r.subscription_ends_at != null ? String(r.subscription_ends_at) : null,
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
  };
}

export async function ensureSubscriptionRow(userId: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      plan: 'free',
      status: 'active',
      provider: 'manual',
      plan_type: 'free',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.warn('[subscriptions] ensure failed', error.message);
  }
}

export async function ensureProfileRow(params: {
  userId: string;
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  planType?: ProfilePlanType;
}): Promise<ProfileRow | null> {
  const email = params.email?.trim() || null;
  const username = params.username?.trim() || `user_${params.userId.slice(0, 8)}`;

  const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_my_profile', {
    p_username: username,
    p_email: email,
  });
  if (!rpcError) {
    const row = rowFromRpc(rpcData);
    if (row) {
      await ensureSubscriptionRow(params.userId);
      return row;
    }
  } else {
    console.warn('[profiles] ensure_my_profile rpc failed', rpcError.message);
  }

  const existing = await fetchProfileByUserId(params.userId);
  if (existing) {
    await ensureSubscriptionRow(params.userId);
    return existing;
  }

  const plan = params.planType ?? 'hobby';
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: params.userId,
        email,
        username,
        plan_type: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, email, username, plan_type, subscription_plan, subscription_ends_at')
    .single();
  if (error) {
    console.warn('[profiles] insert failed', error.message);
    return null;
  }
  const row = rowFromRpc(data);
  if (row) await ensureSubscriptionRow(params.userId);
  return row;
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
    .select('id, email, username, plan_type, subscription_plan, subscription_ends_at')
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
  const { error } = await supabase.rpc('admin_set_user_plan', {
    target_user: row.id,
    next_plan: planType,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, profile: { ...row, plan_type: planType } };
}
