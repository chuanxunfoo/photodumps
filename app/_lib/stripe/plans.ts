/** Subscription tiers billed through Stripe Checkout (one Stripe account). */
export type StripePlanId = 'weekly' | 'monthly' | 'yearly';

export type CheckoutMode = 'subscription' | 'payment';

export type SpinPackId = 'basic' | 'plus' | 'max';

export type PaymentItem = {
  title: string;
  subtitle: string;
  amount: string;
  usd: string;
  /** Required for subscriptions */
  planId?: StripePlanId;
  /** One-time spin packs, bonus packs, etc. */
  checkoutMode?: CheckoutMode;
  productKey?: string;
};

export const SUBSCRIPTION_PLAN_META: Record<
  StripePlanId,
  { interval: 'week' | 'month' | 'year'; usdCents: number; label: string }
> = {
  weekly: { interval: 'week', usdCents: 499, label: 'Weekly' },
  monthly: { interval: 'month', usdCents: 999, label: 'Monthly' },
  yearly: { interval: 'year', usdCents: 4999, label: 'Yearly' },
};

/** One-time spin wheel tiers (USD cents). */
export const SPIN_PACK_META: Record<SpinPackId, { usdCents: number; label: string; bonusSwipes: number }> = {
  basic: { usdCents: 199, label: 'Basic Spin', bonusSwipes: 25 },
  plus: { usdCents: 499, label: 'Plus Spin', bonusSwipes: 75 },
  max: { usdCents: 999, label: 'Max Spin', bonusSwipes: 200 },
};

export function spinPackFromTierLabel(label: string): SpinPackId {
  const l = label.toLowerCase();
  if (l.includes('max')) return 'max';
  if (l.includes('plus')) return 'plus';
  return 'basic';
}
