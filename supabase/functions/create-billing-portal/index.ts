import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getOrCreateStripeCustomer } from '../_shared/billingDb.ts';
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
    const returnUrl = String(body.returnUrl ?? 'dumpit://hub').trim();

    const admin = getSupabaseAdmin();
    const customerId = await getOrCreateStripeCustomer(admin, user.id, user.email ?? undefined, stripe);

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portal.url });
  } catch (e) {
    console.error('[create-billing-portal]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
