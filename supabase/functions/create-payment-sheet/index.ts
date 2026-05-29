import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getOrCreateStripeCustomer } from '../_shared/billingDb.ts';
import { SPIN_PACKS, SUBSCRIPTION_PLANS, priceIdForPlan, type StripePlanId } from '../_shared/plans.ts';
import { getStripe } from '../_shared/stripeClient.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabaseAdmin.ts';

const STRIPE_API_VERSION = '2024-11-20.acacia';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripe = getStripe();
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '';
    if (!publishableKey) {
      return jsonResponse({ error: 'STRIPE_PUBLISHABLE_KEY missing in Supabase secrets.' }, 500);
    }

    const userClient = getSupabaseUser(req);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const mode = body.mode === 'payment' ? 'payment' : 'subscription';
    const admin = getSupabaseAdmin();
    const customerId = await getOrCreateStripeCustomer(admin, user.id, user.email ?? undefined, stripe);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: STRIPE_API_VERSION },
    );

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
      const items = [{ price: priceId }];

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { ...baseMeta, plan_id: planId },
      });

      let invoice = subscription.latest_invoice;
      if (typeof invoice === 'string') {
        invoice = await stripe.invoices.retrieve(invoice, {
          expand: ['payment_intent'],
        });
      }
      let pi = typeof invoice === 'object' && invoice && 'payment_intent' in invoice
        ? invoice.payment_intent
        : null;
      if (typeof pi === 'string') {
        pi = await stripe.paymentIntents.retrieve(pi);
      }
      const paymentIntent = typeof pi === 'object' && pi && 'client_secret' in pi ? pi : null;
      if (!paymentIntent?.client_secret) {
        const invId = typeof invoice === 'object' && invoice && 'id' in invoice
          ? (invoice as { id?: string }).id
          : 'unknown';
        console.error('[create-payment-sheet] missing PI', { subscriptionId: subscription.id, invoiceId: invId });
        return jsonResponse({
          error: 'Could not start subscription payment (no PaymentIntent on invoice). Check Stripe Dashboard → subscription / invoice logs.',
        }, 500);
      }

      const currencyCode = String(paymentIntent.currency ?? 'usd').toUpperCase();
      const amountMajor = typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : plan.usdCents / 100;

      return jsonResponse({
        mode: 'subscription',
        paymentIntentClientSecret: paymentIntent.client_secret,
        customerId,
        ephemeralKeySecret: ephemeralKey.secret,
        publishableKey,
        merchantCountryCode: 'MY',
        currencyCode,
        // Keep field name for the app client; this is the major-unit amount (depends on currency).
        amountUsd: amountMajor,
        label: plan.name,
        planId,
        subscriptionId: subscription.id,
      });
    }

    const productKey = String(body.productKey ?? 'basic');
    const pack = SPIN_PACKS[productKey] ?? SPIN_PACKS.basic;
    const title = String(body.title ?? pack.name);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.usdCents,
      currency: 'usd',
      customer: customerId,
      metadata: {
        ...baseMeta,
        checkout_mode: 'payment',
        product_key: productKey,
        bonus_swipes: String(pack.bonusSwipes),
      },
    });

    const currencyCode = String(paymentIntent.currency ?? 'usd').toUpperCase();
    const amountMajor = typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : pack.usdCents / 100;

    return jsonResponse({
      mode: 'payment',
      paymentIntentClientSecret: paymentIntent.client_secret,
      customerId,
      ephemeralKeySecret: ephemeralKey.secret,
      publishableKey,
      merchantCountryCode: 'MY',
      currencyCode,
      // Keep field name for the app client; this is the major-unit amount (depends on currency).
      amountUsd: amountMajor,
      label: title,
      bonusSwipes: pack.bonusSwipes,
    });
  } catch (e) {
    console.error('[create-payment-sheet]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
