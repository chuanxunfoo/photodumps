import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../../(tabs)/supabase';
import type { CheckoutMode, SpinPackId, StripePlanId } from './plans';

const extra = Constants.expoConfig?.extra as { EXPO_PUBLIC_STRIPE_ENABLED?: string } | undefined;

export function isStripeEnabled(): boolean {
  const flag = extra?.EXPO_PUBLIC_STRIPE_ENABLED ?? process.env.EXPO_PUBLIC_STRIPE_ENABLED;
  if (flag === '0' || flag === 'false') return false;
  return true;
}

export type CheckoutRequest =
  | { mode: 'subscription'; planId: StripePlanId }
  | { mode: 'payment'; productKey: SpinPackId | string; title?: string };

export type CheckoutResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string; needsAuth?: boolean; needsDeploy?: boolean };

function stripeReturnUrl(): string {
  return Linking.createURL('stripe-return');
}

export function parseStripeReturnUrl(url: string): {
  sessionId?: string;
  cancelled?: boolean;
} {
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    if (q.cancelled === '1' || q.cancelled === 'true') return { cancelled: true };
    const sessionId = typeof q.session_id === 'string' ? q.session_id : undefined;
    return { sessionId };
  } catch {
    return {};
  }
}

function formatInvokeError(name: string, error: { message?: string; context?: Response }): string {
  const msg = error.message ?? String(error);
  const status = error.context?.status;

  if (status === 404 || /404|not found|failed to fetch|Failed to send a request/i.test(msg)) {
    return [
      'Payment server is not live yet (Supabase Edge Functions missing).',
      'You (the app owner) deploy once — your users never sign up for Stripe.',
      'Run: npm run deploy:stripe',
      'Guide: supabase/STRIPE_SETUP.md',
    ].join(' ');
  }
  if (status === 401) return 'Session expired. Sign out and sign in again, then retry.';
  if (status === 500 && /STRIPE_SECRET_KEY/i.test(msg)) {
    return 'Stripe secret missing on Supabase. Add STRIPE_SECRET_KEY under Edge Functions → Secrets.';
  }
  return msg || `Could not reach ${name}.`;
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    return { data: null, error: formatInvokeError(name, error as { message?: string; context?: Response }) };
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { data: null, error: String((data as { error: string }).error) };
  }
  return { data: data as T, error: null };
}

export async function createCheckoutSession(req: CheckoutRequest): Promise<
  { ok: true; url: string; sessionId: string } | { ok: false; error: string; needsAuth?: boolean; needsDeploy?: boolean }
> {
  if (!isStripeEnabled()) {
    return { ok: false, error: 'Stripe is disabled. Set EXPO_PUBLIC_STRIPE_ENABLED=1 in app/.env.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: 'Sign in to subscribe or pay securely.', needsAuth: true };
  }

  const body =
    req.mode === 'subscription'
      ? { mode: 'subscription', planId: req.planId, returnUrl: stripeReturnUrl() }
      : { mode: 'payment', productKey: req.productKey, title: req.title, returnUrl: stripeReturnUrl() };

  const res = await invokeFunction<{ url: string; sessionId: string }>('create-checkout-session', body);
  if (res.error || !res.data?.url) {
    return {
      ok: false,
      error: res.error ?? 'Could not start checkout.',
      needsDeploy: res.error?.includes('not deployed') ?? false,
    };
  }
  return { ok: true, url: res.data.url, sessionId: res.data.sessionId };
}

export async function verifyCheckoutSession(sessionId: string): Promise<
  | { ok: true; planType?: string; bonusSwipes?: number }
  | { ok: false; error: string; pending?: boolean }
> {
  const res = await invokeFunction<{
    status: string;
    planType?: string;
    bonusSwipes?: number;
    error?: string;
  }>('verify-checkout-session', { sessionId });

  if (res.error) return { ok: false, error: res.error };
  const status = res.data?.status ?? 'unknown';
  if (status === 'complete' || status === 'paid') {
    return { ok: true, planType: res.data?.planType, bonusSwipes: res.data?.bonusSwipes };
  }
  if (status === 'open' || status === 'processing') {
    return { ok: false, error: 'Payment is still processing. Pull to refresh in a moment.', pending: true };
  }
  return { ok: false, error: res.data?.error ?? 'Payment was not completed.' };
}

export async function openStripeCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const created = await createCheckoutSession(req);
  if (!created.ok) {
    return {
      ok: false,
      error: created.error,
      needsAuth: created.needsAuth,
      needsDeploy: created.needsDeploy,
    };
  }

  const returnUrl = stripeReturnUrl();
  const browser = await WebBrowser.openAuthSessionAsync(created.url, returnUrl);

  if (browser.type === 'cancel' || browser.type === 'dismiss') {
    return { ok: false, error: 'Checkout closed before payment finished.' };
  }

  if (browser.type !== 'success' || !browser.url) {
    return { ok: false, error: 'Checkout did not return a result.' };
  }

  const { sessionId, cancelled } = parseStripeReturnUrl(browser.url);
  if (cancelled) return { ok: false, error: 'Payment cancelled.' };
  const sid = sessionId ?? created.sessionId;
  if (!sid) return { ok: false, error: 'Missing checkout session. Try again.' };

  const verified = await verifyCheckoutSession(sid);
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }
  return { ok: true, sessionId: sid };
}

export async function openBillingPortal(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const returnUrl = Linking.createURL('hub');
  const res = await invokeFunction<{ url: string }>('create-billing-portal', { returnUrl });
  if (res.error || !res.data?.url) return { ok: false, error: res.error ?? 'Could not open billing portal.' };
  await WebBrowser.openBrowserAsync(res.data.url);
  return { ok: true, url: res.data.url };
}
