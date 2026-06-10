import { Platform } from 'react-native';

import { payWithApplePay } from './applePay';
import { openStripeCheckout, type CheckoutRequest } from './checkout';
import { isStripeNativeAvailable } from './nativeAvailable';

export type PayResult =
  | { ok: true }
  | { ok: false; error: string; needsAuth?: boolean };

/**
 * iOS dev/production build → native Apple Pay sheet.
 * Windows / Expo Go / Android → Stripe Checkout in browser (no Mac required).
 */
export async function completePayment(req: CheckoutRequest): Promise<PayResult> {
  if (req.mode === 'subscription' && Platform.OS === 'ios') {
    const { isIosIapAvailable, purchaseIosSubscription } = await import('../iap/iosIap');
    if (isIosIapAvailable()) {
      const result = await purchaseIosSubscription(req.planId);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true };
    }
  }

  if (isStripeNativeAvailable() && Platform.OS === 'ios') {
    return payWithApplePay(req);
  }
  const result = await openStripeCheckout(req);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      needsAuth: result.needsAuth,
    };
  }
  return { ok: true };
}

export function paymentButtonLabel(): string {
  if (Platform.OS === 'ios') {
    return 'Subscribe';
  }
  return 'Continue to secure checkout';
}
