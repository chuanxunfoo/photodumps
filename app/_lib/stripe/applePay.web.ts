import type { CheckoutRequest } from './checkout';

/** Web: Apple Pay / native Stripe unavailable. */
export async function payWithApplePay(_req: CheckoutRequest): Promise<
  { ok: true } | { ok: false; error: string; needsAuth?: boolean }
> {
  return { ok: false, error: 'Apple Pay is not available in the web preview. Use your iPhone app build.' };
}
