import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getOrCreateStripeCustomer } from '../_shared/billingDb.ts';
import { SPIN_PACKS, SUBSCRIPTION_PLANS, priceIdForPlan, type StripePlanId } from '../_shared/plans.ts';
import { getStripe } from '../_shared/stripeClient.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripe = getStripe();
    const userClient = getSupabaseUser(req);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const mode = body.mode === 'payment' ? 'payment' : 'subscription';
    const returnUrl = String(body.returnUrl ?? '').trim();
    if (!returnUrl) return jsonResponse({ error: 'returnUrl required' }, 400);

    const admin = getSupabaseAdmin();
    const customerId = await getOrCreateStripeCustomer(admin, user.id, user.email ?? undefined, stripe);

    const successUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}cancelled=1`;

    const baseMeta = { supabase_user_id: user.id };

    if (mode === 'subscription') {
      const planId = body.planId as StripePlanId;
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) return jsonResponse({ error: 'Invalid planId' }, 400);

      const priceId = priceIdForPlan(planId);
      if (!priceId) {
        return jsonResponse({
          error: `Missing Stripe price for ${planId}. Set STRIPE_PRICE_${planId.toUpperCase()} in Supabase Edge Function secrets.`,
        }, 500);
      }
      const lineItems = [{ price: priceId, quantity: 1 }];

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: 'auto',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: { address: 'auto' },
        subscription_data: {
          metadata: { ...baseMeta, plan_id: planId },
        },
        metadata: { ...baseMeta, plan_id: planId, checkout_mode: 'subscription' },
      });

      return jsonResponse({ url: session.url, sessionId: session.id });
    }

    const productKey = String(body.productKey ?? 'basic');
    const pack = SPIN_PACKS[productKey] ?? SPIN_PACKS.basic;
    const title = String(body.title ?? pack.name);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      client_reference_id: user.id,
      locale: 'auto',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: pack.usdCents,
          product_data: { name: title },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      metadata: {
        ...baseMeta,
        checkout_mode: 'payment',
        product_key: productKey,
        bonus_swipes: String(pack.bonusSwipes),
      },
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('[create-checkout-session]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
