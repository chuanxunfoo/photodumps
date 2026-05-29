import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { addBonusSwipes, grantProFromSubscription } from '../_shared/billingDb.ts';
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
    const sessionId = String(body.sessionId ?? '').trim();
    if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent'],
    });

    const ownerId = session.metadata?.supabase_user_id ?? session.client_reference_id;
    if (ownerId !== user.id) return jsonResponse({ error: 'Session does not belong to this user' }, 403);

    const admin = getSupabaseAdmin();

    if (session.mode === 'subscription') {
      const status = session.status;
      if (status !== 'complete') {
        return jsonResponse({ status: status ?? 'open' });
      }
      const subId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
      if (!subId) return jsonResponse({ status: 'processing' });

      const sub = await stripe.subscriptions.retrieve(subId);
      const planId = session.metadata?.plan_id ?? sub.metadata?.plan_id;
      await grantProFromSubscription(admin, user.id, sub, planId ?? undefined);
      return jsonResponse({ status: 'complete', planType: 'pro' });
    }

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const bonus = parseInt(session.metadata?.bonus_swipes ?? '0', 10);
      if (bonus > 0) await addBonusSwipes(admin, user.id, bonus);
      return jsonResponse({ status: 'paid', bonusSwipes: bonus > 0 ? bonus : undefined });
    }

    return jsonResponse({ status: session.status ?? 'open' });
  } catch (e) {
    console.error('[verify-checkout-session]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
