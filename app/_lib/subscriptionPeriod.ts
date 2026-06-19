import type { StripePlanId } from './stripe/plans';

/** Normalize StoreKit timestamps (ms, unix seconds, or CFAbsoluteTime seconds since 2001). */
export function normalizeIosTimestamp(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw > 1e12) return raw;
  if (raw > 1e9) return raw * 1000;
  const APPLE_EPOCH_MS = Date.UTC(2001, 0, 1, 0, 0, 0, 0);
  return APPLE_EPOCH_MS + raw * 1000;
}

/** Purchase / period start — always the day the user bought, not StoreKit expiry quirks. */
export function purchaseStartMs(purchase: {
  transactionDate?: number | string | null;
}): number {
  const raw = purchase.transactionDate;
  if (raw != null && raw !== '') {
    if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else {
      const normalized = normalizeIosTimestamp(Number(raw));
      if (normalized > 0) return normalized;
    }
  }
  return Date.now();
}

/** Calendar renewal date from purchase day + plan length (weekly +7d, monthly +1mo, yearly +1yr). */
export function computePeriodEndMs(planId: StripePlanId, startMs = Date.now()): number {
  const start = new Date(startMs);
  const y = start.getFullYear();
  const m = start.getMonth();
  const day = start.getDate();

  if (planId === 'weekly') {
    return new Date(y, m, day + 7, start.getHours(), start.getMinutes(), start.getSeconds()).getTime();
  }
  if (planId === 'yearly') {
    return new Date(y + 1, m, day, start.getHours(), start.getMinutes(), start.getSeconds()).getTime();
  }
  return new Date(y, m + 1, day, start.getHours(), start.getMinutes(), start.getSeconds()).getTime();
}

export function planIdFromProductId(productId: string): StripePlanId | null {
  const id = productId.trim().toLowerCase();
  if (id.includes('weekly')) return 'weekly';
  if (id.includes('yearly') || id.includes('annual')) return 'yearly';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

type PurchasePeriodInput = {
  expirationDateIOS?: number | null;
  productId?: string | null;
  transactionDate?: number | string | null;
};

/**
 * Next renewal date shown in-app. Computed from purchase date + plan length so weekly /
 * monthly / yearly always show the correct calendar year (StoreKit sandbox expiry can lie).
 */
export function periodEndMsFromPurchase(
  purchase: PurchasePeriodInput,
  planId: StripePlanId,
): number {
  const resolved = planIdFromProductId(String(purchase.productId ?? '')) ?? planId;
  return computePeriodEndMs(resolved, purchaseStartMs(purchase));
}

/** e.g. "18 June 2027" — day, full month, year. */
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
