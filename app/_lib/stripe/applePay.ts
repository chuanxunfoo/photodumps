import { Platform } from 'react-native';

import { supabase } from '../../(tabs)/supabase';
import type { CheckoutRequest } from './checkout';
import { EXPO_GO_STRIPE_MSG, isStripeNativeAvailable } from './nativeAvailable';
import type { StripePlanId } from './plans';
import { SUBSCRIPTION_PLAN_META } from './plans';

type SheetParams = {
  paymentIntentClientSecret: string;
  merchantCountryCode: string;
  currencyCode: string;
  amountUsd: number;
  label: string;
  mode: 'subscription' | 'payment';
  planId?: StripePlanId;
};

async function loadStripeNative() {
  if (!isStripeNativeAvailable()) return null;
  return import('@stripe/stripe-react-native');
}

async function fetchPaymentSheet(req: CheckoutRequest): Promise<
  { ok: true; params: SheetParams } | { ok: false; error: string }
> {
  const body =
    req.mode === 'subscription'
      ? { mode: 'subscription', planId: req.planId }
      : { mode: 'payment', productKey: req.productKey, title: req.title };

  const { data, error } = await supabase.functions.invoke('create-payment-sheet', { body });
  if (error) {
    const msg = error.message ?? String(error);
    if (/404|not found|failed to fetch/i.test(msg)) {
      return {
        ok: false,
        error: 'Payment server not deployed. Run: npx supabase functions deploy create-payment-sheet',
      };
    }
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.clone().text();
        const parsed = JSON.parse(raw) as { error?: string };
        if (parsed?.error) {
          return { ok: false, error: `[${ctx.status}] ${parsed.error}` };
        }
        if (raw) return { ok: false, error: `[${ctx.status}] ${raw.slice(0, 300)}` };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: msg };
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return { ok: false, error: String((data as { error: string }).error) };
  }
  const p = data as SheetParams & { paymentIntentClientSecret?: string };
  if (!p?.paymentIntentClientSecret) {
    return { ok: false, error: 'Invalid payment response from server.' };
  }
  return { ok: true, params: p };
}

/** Native Apple Pay sheet (Face ID / double-click side button) — no Stripe website. */
export async function payWithApplePay(req: CheckoutRequest): Promise<
  { ok: true } | { ok: false; error: string; needsAuth?: boolean }
> {
  if (!isStripeNativeAvailable()) {
    return { ok: false, error: EXPO_GO_STRIPE_MSG };
  }

  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple Pay subscriptions are available on iPhone only.' };
  }

  const stripe = await loadStripeNative();
  if (!stripe) {
    return { ok: false, error: EXPO_GO_STRIPE_MSG };
  }

  const { PlatformPay, confirmPlatformPayPayment, isPlatformPaySupported } = stripe;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: 'Sign in to subscribe.', needsAuth: true };
  }

  const supported = await isPlatformPaySupported({ googlePay: undefined });
  if (!supported) {
    return {
      ok: false,
      error: 'Apple Pay is not set up on this device. Add a card in Wallet, or use a physical iPhone (not Simulator).',
    };
  }

  const fetched = await fetchPaymentSheet(req);
  if (!fetched.ok) return fetched;

  const { params } = fetched;
  const amountStr = params.amountUsd.toFixed(2);

  const applePay =
    req.mode === 'subscription' && params.planId
      ? {
        cartItems: [{
          label: params.label,
          amount: amountStr,
          paymentType: PlatformPay.PaymentType.Recurring,
          intervalUnit:
            SUBSCRIPTION_PLAN_META[params.planId].interval === 'week'
              ? PlatformPay.IntervalUnit.Week
              : SUBSCRIPTION_PLAN_META[params.planId].interval === 'year'
                ? PlatformPay.IntervalUnit.Year
                : PlatformPay.IntervalUnit.Month,
          intervalCount: 1,
        }],
        merchantCountryCode: params.merchantCountryCode,
        currencyCode: params.currencyCode,
      }
      : {
        cartItems: [{
          label: params.label,
          amount: amountStr,
          paymentType: PlatformPay.PaymentType.Immediate,
        }],
        merchantCountryCode: params.merchantCountryCode,
        currencyCode: params.currencyCode,
      };

  const { error } = await confirmPlatformPayPayment(params.paymentIntentClientSecret, { applePay });
  if (error) {
    if (error.code === 'Canceled') return { ok: false, error: 'Payment cancelled.' };
    return { ok: false, error: error.message ?? 'Apple Pay failed.' };
  }
  return { ok: true };
}
