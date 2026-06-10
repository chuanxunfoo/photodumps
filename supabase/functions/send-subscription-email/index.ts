import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseUser } from '../_shared/supabaseAdmin.ts';

type PlanId = 'weekly' | 'monthly' | 'yearly';

const PLAN_COPY: Record<PlanId, { title: string; length: string; renews: string; usd: string; myr: string }> = {
  weekly: {
    title: 'photodumps Pro — Weekly',
    length: '7 days',
    renews: 'every week',
    usd: 'USD 4.99/week',
    myr: 'MYR 22.90/week',
  },
  monthly: {
    title: 'photodumps Pro — Monthly',
    length: '1 month',
    renews: 'every month',
    usd: 'USD 9.99/month',
    myr: 'MYR 49.90/month',
  },
  yearly: {
    title: 'photodumps Pro — Yearly',
    length: '1 year',
    renews: 'every year',
    usd: 'USD 49.99/year',
    myr: 'MYR 229.90/year',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = getSupabaseUser(req);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user?.email) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const planId = String(body.planId ?? 'monthly') as PlanId;
    const plan = PLAN_COPY[planId] ?? PLAN_COPY.monthly;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('SUBSCRIPTION_EMAIL_FROM') ?? 'photodumps <onboarding@resend.dev>';

    if (!resendKey) {
      return jsonResponse({ ok: true, emailSent: false, reason: 'RESEND_API_KEY not configured' });
    }

    const html = `
      <h2>Welcome to photodumps Pro</h2>
      <p>Your subscription is active.</p>
      <ul>
        <li><strong>Plan:</strong> ${plan.title}</li>
        <li><strong>Length:</strong> ${plan.length}</li>
        <li><strong>Price:</strong> ${plan.usd} (${plan.myr})</li>
        <li><strong>Renews:</strong> ${plan.renews} via the App Store until cancelled</li>
      </ul>
      <p>Manage or cancel anytime: iPhone Settings → Apple ID → Subscriptions.</p>
      <p><a href="https://photodumps.netlify.app/terms.html">Terms of Use</a> · <a href="https://photodumps.netlify.app/privacy.html">Privacy Policy</a></p>
      <p>Questions? photodumps.support@gmail.com</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: `photodumps Pro subscription confirmed — ${plan.title}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return jsonResponse({ ok: false, emailSent: false, error: detail.slice(0, 240) }, 502);
    }

    return jsonResponse({ ok: true, emailSent: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Email failed';
    return jsonResponse({ error: msg }, 500);
  }
});
