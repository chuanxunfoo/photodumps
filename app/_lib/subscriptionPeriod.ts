import type { StripePlanId } from './stripe/plans';

/** Compute renewal / period end from purchase time when StoreKit omits expirationDateIOS. */
export function computePeriodEndMs(planId: StripePlanId, startMs = Date.now()): number {
  const d = new Date(startMs);
  if (planId === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (planId === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.getTime();
}

export function planIdFromProductId(productId: string): StripePlanId | null {
  const id = productId.trim().toLowerCase();
  if (id.includes('weekly')) return 'weekly';
  if (id.includes('yearly') || id.includes('annual')) return 'yearly';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

export function periodEndMsFromPurchase(
  purchase: { expirationDateIOS?: number | null; productId?: string | null },
  planId: StripePlanId,
): number {
  const raw = purchase.expirationDateIOS;
  if (raw != null && raw > 0) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  return computePeriodEndMs(planId);
}

/** e.g. "12 June 2026" — day, full month, year. */
export function formatSubscriptionEndDate(ms: number, language?: string): string {
  const locale = language === 'es' ? 'es-ES' : 'en-GB';
  return new Date(ms).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function planLabel(planId: StripePlanId): string {
  if (planId === 'weekly') return 'Weekly';
  if (planId === 'yearly') return 'Yearly';
  return 'Monthly';
}
