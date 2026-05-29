import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set in Supabase Edge Function secrets.');
  if (!stripe) {
    stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia', httpClient: Stripe.createFetchHttpClient() });
  }
  return stripe;
}
