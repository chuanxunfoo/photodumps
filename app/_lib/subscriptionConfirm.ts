import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from './legalUrls';
import type { StripePlanId } from './stripe/plans';
import { supabase } from '../(tabs)/supabase';

export type SubscriptionPlanCopy = {
  title: string;
  length: string;
  renewsEvery: string;
  priceUsd: string;
  priceMyr: string;
};

export const SUBSCRIPTION_PLAN_COPY: Record<StripePlanId, SubscriptionPlanCopy> = {
  weekly: {
    title: 'photodumps Pro — Weekly',
    length: '7 days',
    renewsEvery: 'every week',
    priceUsd: 'USD 4.99/week',
    priceMyr: 'MYR 22.90/week',
  },
  monthly: {
    title: 'photodumps Pro — Monthly',
    length: '1 month',
    renewsEvery: 'every month',
    priceUsd: 'USD 9.99/month',
    priceMyr: 'MYR 49.90/month',
  },
  yearly: {
    title: 'photodumps Pro — Yearly',
    length: '1 year',
    renewsEvery: 'every year',
    priceUsd: 'USD 49.99/year',
    priceMyr: 'MYR 229.90/year',
  },
};

export function subscriptionSuccessMessage(planId: StripePlanId): string {
  const p = SUBSCRIPTION_PLAN_COPY[planId];
  return `You're on photodumps Pro (${p.title}).\n\nRenews ${p.renewsEvery} via the App Store. Manage anytime in Settings → Apple ID → Subscriptions.\n\nTerms: ${TERMS_OF_SERVICE_URL}\nPrivacy: ${PRIVACY_POLICY_URL}`;
}

export async function sendSubscriptionConfirmationEmail(
  planId: StripePlanId,
): Promise<{ emailSent: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-subscription-email', {
      body: { planId },
    });
    if (error) return { emailSent: false };
    const body = data as { emailSent?: boolean } | null;
    return { emailSent: !!body?.emailSent };
  } catch {
    return { emailSent: false };
  }
}
