import { supabase } from '../(tabs)/supabase';
import type { SpinPackId, StripePlanId } from './stripe/plans';

function parseMyrAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/[^0-9.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function planToProviderPlan(planId: StripePlanId): 'weekly' | 'monthly' | 'yearly' {
  if (planId === 'weekly') return 'weekly';
  if (planId === 'yearly') return 'yearly';
  return 'monthly';
}

function planToDbPlan(planId: StripePlanId): 'pro_weekly' | 'pro_monthly' | 'pro_yearly' {
  if (planId === 'weekly') return 'pro_weekly';
  if (planId === 'yearly') return 'pro_yearly';
  return 'pro_monthly';
}

export async function syncBonusSwipesRow(userId: string, bonusSwipes: number): Promise<void> {
  await supabase
    .from('subscriptions')
    .upsert(
      { user_id: userId, bonus_swipes: Math.max(0, Math.floor(bonusSwipes)) },
      { onConflict: 'user_id' },
    );
}

export async function recordSpinPurchase(params: {
  userId: string;
  tier: SpinPackId;
  amountMyrDisplay?: string;
  swipesWon: number;
}): Promise<void> {
  const amountMyr = parseMyrAmount(params.amountMyrDisplay);
  const payload = {
    user_id: params.userId,
    tier: params.tier,
    amount_myr: amountMyr,
    swipes_won: Math.max(0, Math.floor(params.swipesWon)),
    status: 'completed',
  };

  await Promise.allSettled([
    supabase.from('spin_purchases').insert({
      user_id: payload.user_id,
      tier: payload.tier,
      amount_myr: payload.amount_myr,
      swipes_won: payload.swipes_won,
    }),
    supabase.from('swipe_purchases').insert(payload),
  ]);
}

export async function recordSubscriptionActivation(params: {
  userId: string;
  planId: StripePlanId;
  provider: 'apple' | 'google' | 'stripe' | 'manual';
  status?: 'active' | 'trial' | 'cancelled' | 'expired';
  periodEndMs?: number;
}): Promise<void> {
  const status = params.status ?? 'active';
  const providerPlan = planToProviderPlan(params.planId);
  const nowIso = new Date().toISOString();
  const periodEndIso = params.periodEndMs
    ? new Date(params.periodEndMs).toISOString()
    : null;
  await Promise.allSettled([
    supabase
      .from('profiles')
      .update({
        plan_type: 'pro',
        subscription_plan: providerPlan,
        ...(periodEndIso ? { subscription_ends_at: periodEndIso } : {}),
      })
      .eq('id', params.userId),
    supabase.from('subscriptions').upsert(
      {
        user_id: params.userId,
        plan: planToDbPlan(params.planId),
        plan_type: providerPlan,
        status,
        provider: params.provider,
        current_period_start: nowIso,
        ...(periodEndIso ? { current_period_end: periodEndIso } : {}),
      },
      { onConflict: 'user_id' },
    ),
  ]);
}
