export type StripePlanId = 'weekly' | 'monthly' | 'yearly';

export const SUBSCRIPTION_PLANS: Record<
  StripePlanId,
  { interval: 'week' | 'month' | 'year'; usdCents: number; name: string }
> = {
  weekly: { interval: 'week', usdCents: 499, name: 'photodumps Pro — Weekly' },
  monthly: { interval: 'month', usdCents: 999, name: 'photodumps Pro — Monthly' },
  yearly: { interval: 'year', usdCents: 4999, name: 'photodumps Pro — Yearly' },
};

export const SPIN_PACKS: Record<string, { usdCents: number; name: string; bonusSwipes: number }> = {
  basic: { usdCents: 199, name: 'Basic Spin Pack', bonusSwipes: 25 },
  plus: { usdCents: 499, name: 'Plus Spin Pack', bonusSwipes: 75 },
  max: { usdCents: 999, name: 'Max Spin Pack', bonusSwipes: 200 },
};

export function priceIdForPlan(planId: StripePlanId): string | undefined {
  const key = `STRIPE_PRICE_${planId.toUpperCase()}` as const;
  const map: Record<StripePlanId, string | undefined> = {
    weekly: Deno.env.get('STRIPE_PRICE_WEEKLY'),
    monthly: Deno.env.get('STRIPE_PRICE_MONTHLY'),
    yearly: Deno.env.get('STRIPE_PRICE_YEARLY'),
  };
  return map[planId]?.trim() || undefined;
}
