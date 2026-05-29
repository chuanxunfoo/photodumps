# App Store subscription sheet vs Stripe

## What you see in apps like Swipewipe

The system sheet that says **“App Store”** at the top (trial line, “Confirm with Side Button”) is **Apple In‑App Purchase (IAP)** — StoreKit. Apple hosts the product, Apple bills the user, and Apple takes a commission.

That UI **cannot** be produced by Stripe. Stripe uses either:

- **Stripe Checkout** (Safari / in-app browser), or  
- **Stripe + Apple Pay** (Wallet / Face ID, but still **Stripe** as merchant — not the App Store sheet).

## If you want the exact App Store experience

You need:

1. **App Store Connect** — subscription group + products (weekly / monthly / yearly, prices, optional free trial there).
2. **In-app code** — e.g. [`react-native-iap`](https://github.com/dooboolab-community/react-native-iap) or **RevenueCat** (simpler) to load products and call `purchase`.
3. **Optional server** — receipt validation / Supabase Edge Function to set `profiles.plan_type` after Apple confirms the subscription (or use RevenueCat’s webhooks).

We do **not** implement that path in the Stripe Edge Functions; those are for Stripe only.

## App Store Review (important)

If you distribute on the **public App Store** and sell **digital** subscriptions (Pro features), Apple generally expects **IAP** for that purchase flow, not an external Stripe checkout — unless you qualify for a narrow exception (e.g. “reader” apps). Many apps use **IAP on iOS** and Stripe on web/Android.

## Summary

| Goal | Approach |
|------|----------|
| Same UI as screenshot (“App Store” header) | **IAP** (StoreKit / react-native-iap / RevenueCat) |
| Stripe + Apple Pay / browser | Current **Supabase + Stripe** setup |

You can run **both**: IAP on iOS App Store build, Stripe elsewhere — with clear product parity and accounting.
