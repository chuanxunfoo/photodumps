# Stripe payments — setup guide

## Who needs a Stripe account?

| Who | Needs Stripe? |
|-----|----------------|
| **You** (app owner) | **Yes** — one Stripe account receives all payments |
| **Your users** | **No** — they pay as guests with card / Apple Pay / Google Pay / local methods |

Users never create a Stripe login. They only see Stripe’s hosted checkout page.

---

## Why you see “Payment server is not live yet”

The app calls **Supabase Edge Functions** on your project. Right now they return **404** because they were never deployed.

**Fix (about 10 minutes):**

### Step A — Stripe Dashboard

1. [dashboard.stripe.com](https://dashboard.stripe.com) → complete account setup (test mode is fine).
2. **Settings → Payment methods** → turn on:
   - Cards, **Apple Pay**, **Google Pay**, **Link**
   - Under **Malaysia**: **FPX**, **GrabPay** (if you want MY methods)
3. **Products** → create **photodumps Pro** with weekly / monthly / yearly prices and copy each **Price ID** (`price_...`).
4. **Developers → Webhooks** → endpoint:
   - `https://ozuaijxdifqnbuavuelm.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
   - Save **Signing secret** (`whsec_...`).

### Step B — Supabase secrets

[Supabase Dashboard](https://supabase.com/dashboard/project/ozuaijxdifqnbuavuelm/settings/functions) → **Edge Functions** → **Secrets**:

| Name | Value |
|------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe → Developers → API keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (same page — required for Apple Pay in app) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the webhook above |
| `STRIPE_PRICE_WEEKLY` | required `price_...` for weekly subscription |
| `STRIPE_PRICE_MONTHLY` | required `price_...` for monthly subscription |
| `STRIPE_PRICE_YEARLY` | required `price_...` for yearly subscription |

### Step C — SQL (once)

Supabase → **SQL Editor** → run:

`app/supabase/migrations/20260519120000_stripe_billing.sql`

### Step D — Deploy functions (required)

In PowerShell at repo root:

```powershell
cd c:\Users\ChuanXunFoo\Dumplt
npm run deploy:stripe
```

This uses `npx supabase` (no global install). Log in when the browser opens.

Or deploy manually:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref ozuaijxdifqnbuavuelm
npx supabase@latest functions deploy create-payment-sheet
npx supabase@latest functions deploy create-checkout-session
npx supabase@latest functions deploy verify-checkout-session
npx supabase@latest functions deploy create-billing-portal
npx supabase@latest functions deploy stripe-webhook --no-verify-jwt
```

### Step E — Verify

Open in a browser (should **not** be 404):

`https://ozuaijxdifqnbuavuelm.supabase.co/functions/v1/create-payment-sheet`

(You may see “Method not allowed” for GET — that’s OK; **404** means not deployed.)

### Step F — App

`app/.env`:

```env
EXPO_PUBLIC_STRIPE_ENABLED=1
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_STRIPE_MERCHANT_ID=merchant.com.yourname.dumpitapp
```

Create an **Apple Pay Merchant ID** in Apple Developer, then enable Apple Pay in Stripe → Payment methods.

**Rebuild the iOS dev client** — Apple Pay does not work in Expo Go.

### No Mac? (Windows only)

You **cannot** run `npx expo run:ios` without macOS. Use **EAS Build** (Expo’s cloud Macs):

```powershell
cd c:\Users\ChuanXunFoo\Dumplt
npx eas-cli build --profile development --platform ios
```

- Needs a free [Expo](https://expo.dev) account and an **Apple Developer** account ($99/year) to install on your iPhone.
- When the build finishes, scan the QR code / install the `.ipa` on your phone.
- Then run `npm run start:dev-client` on Windows and open the **dev client** app (not Expo Go).

**Until you have that iOS build:** subscribe still works via **Stripe Checkout in the browser** (opened from the app) — test on Windows or Android with `npm run start:dev-client` or `npm start`.

---

## Test payment

1. Sign in on a **physical iPhone** with Apple Pay set up in Wallet.
2. Pro → plan → subscribe — **Apple Pay sheet** should appear (double-click side button / Face ID).
3. No free trial — charged immediately.
4. Account should show Pro after payment (webhook).

---

## International / convenient methods

Stripe Checkout (`locale: auto`) shows methods based on the customer’s country and your Stripe Dashboard settings:

- Worldwide: Visa, Mastercard, Amex, **Apple Pay**, **Google Pay**, **Link**
- Malaysia: **FPX**, **GrabPay**, cards, wallets where enabled
- Other regions: local methods Stripe supports there

**Touch ’n Go** is not on standard Stripe Malaysia; FPX / GrabPay / cards / Apple Pay cover most users.

All money goes to **your** Stripe balance → one payout bank account you configure in Stripe.

---

## App Store sheet (“Confirm with Side Button” + “App Store” header)

That UI is **Apple In‑App Purchase**, not Stripe. See **`docs/APP_STORE_VS_STRIPE.md`**.

---

## App Store note

If you ship on the **public App Store**, Apple may require **In-App Purchase** for digital subscriptions. Stripe Checkout is correct for TestFlight, direct install, and Android.
