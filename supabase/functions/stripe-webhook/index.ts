import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { addBonusSwipes, grantProFromSubscription, revokePro, userIdFromStripeObject } from '../_shared/billingDb.ts';
import { getStripe } from '../_shared/stripeClient.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  const stripe = getStripe();
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (e) {
    console.error('[stripe-webhook] signature', e);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = userIdFromStripeObject(session);
        if (!userId) break;

        if (session.mode === 'payment') {
          const bonus = parseInt(session.metadata?.bonus_swipes ?? '0', 10);
          if (bonus > 0) await addBonusSwipes(admin, userId, bonus);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = userIdFromStripeObject(sub);
        if (!userId) break;
        if (['active', 'trialing'].includes(sub.status)) {
          await grantProFromSubscription(admin, userId, sub, sub.metadata?.plan_id);
        } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
          await revokePro(admin, userId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = userIdFromStripeObject(sub);
        if (userId) await revokePro(admin, userId);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = userIdFromStripeObject(sub);
        if (userId && sub.status !== 'active' && sub.status !== 'trialing') {
          await revokePro(admin, userId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('[stripe-webhook] handler', event.type, e);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
