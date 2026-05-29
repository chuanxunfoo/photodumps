import type { Stripe } from 'https://esm.sh/stripe@17.7.0?target=deno';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { StripePlanId } from './plans.ts';

export async function getOrCreateStripeCustomer(
  admin: SupabaseClient,
  userId: string,
  email: string | undefined,
  stripe: Stripe,
): Promise<string> {
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email ?? (profile?.email as string | undefined) ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return customer.id;
}

export async function grantProFromSubscription(
  admin: SupabaseClient,
  userId: string,
  sub: Stripe.Subscription,
  planId?: string,
) {
  const active = ['active', 'trialing'].includes(sub.status);
  await admin
    .from('profiles')
    .update({
      plan_type: active ? 'pro' : 'hobby',
      stripe_subscription_id: sub.id,
      stripe_subscription_status: sub.status,
      stripe_price_id: sub.items.data[0]?.price?.id ?? null,
      subscription_plan: planId ?? sub.metadata?.plan_id ?? null,
      subscription_ends_at: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function revokePro(admin: SupabaseClient, userId: string) {
  await admin
    .from('profiles')
    .update({
      plan_type: 'hobby',
      stripe_subscription_status: 'canceled',
      subscription_ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function addBonusSwipes(admin: SupabaseClient, userId: string, amount: number) {
  const { data: row } = await admin.from('subscriptions').select('bonus_swipes').eq('user_id', userId).maybeSingle();
  const current = (row?.bonus_swipes as number | undefined) ?? 0;
  const next = current + amount;
  await admin.from('subscriptions').upsert(
    { user_id: userId, bonus_swipes: next, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

export function userIdFromStripeObject(obj: {
  metadata?: Record<string, string>;
  client_reference_id?: string | null;
}): string | null {
  return obj.metadata?.supabase_user_id ?? obj.client_reference_id ?? null;
}

export function normalizePlanId(raw: unknown): StripePlanId | null {
  const v = String(raw ?? '');
  if (v === 'weekly' || v === 'monthly' || v === 'yearly') return v;
  return null;
}
