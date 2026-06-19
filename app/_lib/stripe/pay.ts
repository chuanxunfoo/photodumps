import { Platform } from 'react-native';

import { payWithApplePay } from './applePay';
import { openStripeCheckout, type CheckoutRequest } from './checkout';
import { isStripeNativeAvailable } from './nativeAvailable';

export type PayResult =
  | { ok: true }
  | { ok: false; error: string; needsAuth?: boolean };

/**
 * iOS App Store build → In-App Purchase (subscriptions).
 * Android / web → Stripe Checkout in browser.
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

export function paymentButtonLabel(mode: CheckoutRequest['mode'] = 'subscription'): string {
  if (Platform.OS === 'ios') {
    return mode === 'payment' ? 'Buy spin pack' : 'Subscribe with App Store';
  }
  return mode === 'payment' ? 'Continue to checkout' : 'Continue to secure checkout';
}
