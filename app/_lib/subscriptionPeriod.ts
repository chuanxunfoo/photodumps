import type { StripePlanId } from './stripe/plans';



/** Normalize StoreKit timestamps (ms, unix seconds, or CFAbsoluteTime seconds since 2001). */

export function normalizeIosTimestamp(raw: number): number {

  if (!Number.isFinite(raw) || raw <= 0) return 0;

  if (raw > 1e12) return raw;

  if (raw > 1e9) return raw * 1000;

  const APPLE_EPOCH_MS = Date.UTC(2001, 0, 1, 0, 0, 0, 0);

  return APPLE_EPOCH_MS + raw * 1000;

}



/** Minimum span from purchase start before we trust expirationDateIOS for each plan. */

function minTrustedPeriodMs(planId: StripePlanId): number {

  const day = 24 * 60 * 60 * 1000;

  if (planId === 'weekly') return 5 * day;

  if (planId === 'yearly') return 360 * day;

  return 27 * day;

}



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



type PurchasePeriodInput = {

  expirationDateIOS?: number | null;

  productId?: string | null;

  transactionDate?: number | null;

};



export function periodEndMsFromPurchase(

  purchase: PurchasePeriodInput,

  planId: StripePlanId,

): number {

  const startMs = (() => {

    const tx = Number(purchase.transactionDate ?? 0);

    const normalized = normalizeIosTimestamp(tx);

    return normalized > 0 ? normalized : Date.now();

  })();



  const rawExp = Number(purchase.expirationDateIOS ?? 0);

  if (Number.isFinite(rawExp) && rawExp > 0) {

    const expMs = normalizeIosTimestamp(rawExp);

    if (expMs > startMs + minTrustedPeriodMs(planId)) {

      return expMs;

    }

  }



  return computePeriodEndMs(planId, startMs);

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


