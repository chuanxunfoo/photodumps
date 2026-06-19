import Constants from 'expo-constants';
import { AppState, InteractionManager, Platform } from 'react-native';

import { markNativeQuiet, runNativeOperation, waitUntilNativeIdle } from '../launchStability';
import { periodEndMsFromPurchase, planIdFromProductId } from '../subscriptionPeriod';
import { isExpoGo } from '../stripe/nativeAvailable';
import type { StripePlanId } from '../stripe/plans';

const ALL_PLAN_IDS: StripePlanId[] = ['weekly', 'monthly', 'yearly'];

export type IapPurchaseResult =
  | { ok: true; productId: string; planId: StripePlanId; periodEndMs: number }
  | { ok: false; error: string; cancelled?: boolean };

type PendingPurchase = {
  productId: string;
  planId: StripePlanId;
  settle: (result: IapPurchaseResult) => void;
  timer: ReturnType<typeof setTimeout>;
  pollTimer: ReturnType<typeof setInterval> | null;
};

let iapMod: typeof import('react-native-iap') | null = null;
let bootPromise: Promise<void> | null = null;
let pending: PendingPurchase | null = null;
let listenersAttached = false;

function getIapProductId(planId: StripePlanId): string {
  const extra = Constants.expoConfig?.extra as {
    EXPO_PUBLIC_IOS_IAP_WEEKLY_PRODUCT_ID?: string;
    EXPO_PUBLIC_IOS_IAP_MONTHLY_PRODUCT_ID?: string;
    EXPO_PUBLIC_IOS_IAP_YEARLY_PRODUCT_ID?: string;
  } | undefined;

  const map: Record<StripePlanId, string | undefined> = {
    weekly: extra?.EXPO_PUBLIC_IOS_IAP_WEEKLY_PRODUCT_ID ?? process.env.EXPO_PUBLIC_IOS_IAP_WEEKLY_PRODUCT_ID,
    monthly: extra?.EXPO_PUBLIC_IOS_IAP_MONTHLY_PRODUCT_ID ?? process.env.EXPO_PUBLIC_IOS_IAP_MONTHLY_PRODUCT_ID,
    yearly: extra?.EXPO_PUBLIC_IOS_IAP_YEARLY_PRODUCT_ID ?? process.env.EXPO_PUBLIC_IOS_IAP_YEARLY_PRODUCT_ID,
  };
  return String(map[planId] ?? '').trim();
}

function allConfiguredIapSkus(): string[] {
  return ALL_PLAN_IDS.map(getIapProductId).filter(Boolean);
}

export function isIosIapAvailable(): boolean {
  return Platform.OS === 'ios' && !isExpoGo();
}

function stopPoll(p: PendingPurchase) {
  if (p.pollTimer) {
    clearInterval(p.pollTimer);
    p.pollTimer = null;
  }
}

function clearPending(result: IapPurchaseResult) {
  if (!pending) return;
  clearTimeout(pending.timer);
  stopPoll(pending);
  const settle = pending.settle;
  pending = null;
  settle(result);
}

function settleSuccess(
  purchase: {
    expirationDateIOS?: number | null;
    productId?: string | null;
    transactionDate?: number | null;
  },
  productId: string,
  planId: StripePlanId,
) {
  if (!pending) return;
  const periodEndMs = periodEndMsFromPurchase(purchase, planId);
  clearPending({ ok: true, productId, planId, periodEndMs });
}

function attachListeners(iap: typeof import('react-native-iap')) {
  if (listenersAttached) return;
  listenersAttached = true;

  iap.purchaseUpdatedListener(async (purchase) => {
    if (!pending) return;
    const purchasedId = String(purchase.productId ?? purchase.currentPlanId ?? '').trim();
    const expectedId = pending.productId;
    const skus = allConfiguredIapSkus();
    const matchesPending = purchasedId === expectedId;
    const matchesSku = skus.includes(purchasedId);
    if (!matchesPending && !matchesSku) return;
    if (purchase.purchaseState === 'pending') return;

    const productId = matchesPending ? expectedId : purchasedId;
    const planId = pending.planId ?? planIdFromProductId(productId) ?? 'monthly';
    try {
      await iap.finishTransaction({ purchase, isConsumable: false });
    } catch (e) {
      console.warn('[iap] finishTransaction failed', e);
    }
    settleSuccess(purchase, productId, planId);
  });

  iap.purchaseErrorListener((error) => {
    if (!pending) return;
    const msg = error.message || 'Purchase failed.';
    if (error.code === 'user-cancelled') {
      clearPending({ ok: false, error: 'Purchase cancelled.', cancelled: true });
      return;
    }
    clearPending({ ok: false, error: msg });
  });
}

async function pollForCompletedPurchase(iap: typeof import('react-native-iap'), planId: StripePlanId) {
  if (!pending) return;
  try {
    const purchases = await iap.getAvailablePurchases();
    const skus = allConfiguredIapSkus();
    const hit = purchases.find((p) => {
      const id = String(p.productId ?? '').trim();
      return skus.includes(id);
    });
    if (hit) {
      const productId = String(hit.productId ?? pending!.productId).trim();
      const resolvedPlan = planIdFromProductId(productId) ?? planId;
      try {
        await iap.finishTransaction({ purchase: hit, isConsumable: false });
      } catch {
        /* already finished */
      }
      settleSuccess(hit, productId, resolvedPlan);
    }
  } catch (e) {
    console.warn('[iap] poll getAvailablePurchases failed', e);
  }
}

/** Boot StoreKit when subscription screen opens — never at app launch. */
export async function bootIapManager(): Promise<void> {
  if (!isIosIapAvailable()) return;
  if (bootPromise) return bootPromise;

  markNativeQuiet(2000);
  bootPromise = runNativeOperation(async () => {
    const iap = await import('react-native-iap');
    iapMod = iap;
    attachListeners(iap);
    await iap.initConnection();
    const skus = allConfiguredIapSkus();
    if (skus.length > 0) {
      await iap.fetchProducts({ skus, type: 'subs' }).catch(() => undefined);
    }
  }).catch((e) => {
    bootPromise = null;
    listenersAttached = false;
    iapMod = null;
    throw e;
  });

  return bootPromise;
}

export async function warmIosIapConnection(): Promise<void> {
  await bootIapManager();
}

/** Returns StoreKit products for configured SKUs — empty if ASC products are missing/misconfigured. */
export async function fetchIosSubscriptionProducts(): Promise<
  { ok: true; productIds: string[] } | { ok: false; error: string }
> {
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'App Store subscriptions need a TestFlight or App Store build.' };
  }
  const skus = allConfiguredIapSkus();
  if (skus.length === 0) {
    return { ok: false, error: 'No subscription product IDs are configured in this build.' };
  }
  try {
    await bootIapManager();
    const products = await iapMod!.fetchProducts({ skus, type: 'subs' });
    const found = (products ?? [])
      .map((p) => String((p as { id?: string; productId?: string }).id ?? (p as { productId?: string }).productId ?? '').trim())
      .filter(Boolean);
    if (found.length === 0) {
      return {
        ok: false,
        error:
          'Subscription plans are not available from the App Store yet. In App Store Connect, ensure photodumps Pro weekly/monthly/yearly subscriptions are Ready to Submit, Cleared for Sale, and linked to this app version.',
      };
    }
    return { ok: true, productIds: found };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not load App Store subscription products.' };
  }
}

export async function restoreIosPurchases(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'Restore is available on iOS builds only.' };
  }
  try {
    await bootIapManager();
    const skus = allConfiguredIapSkus();
    const purchases = await iapMod!.getAvailablePurchases();
    const active = purchases.some((p) => skus.includes(String(p.productId ?? '').trim()));
    if (!active) {
      return { ok: false, error: 'No active photodumps Pro subscription found for this Apple ID.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not restore purchases.' };
  }
}

export async function purchaseIosSubscription(planId: StripePlanId): Promise<IapPurchaseResult> {
  if (Platform.OS !== 'ios') return { ok: false, error: 'App Store subscription is iOS-only.' };
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'App Store purchase needs a TestFlight or App Store build.' };
  }

  const productId = getIapProductId(planId);
  if (!productId) {
    return { ok: false, error: `Missing IAP product ID for ${planId}.` };
  }
  if (/^(prod_|price_)/i.test(productId)) {
    return { ok: false, error: 'Configured product ID is a Stripe ID, not an App Store product ID.' };
  }

  if (pending) {
    return { ok: false, error: 'A purchase is already in progress.' };
  }

  try {
    await bootIapManager();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'App Store is unavailable.' };
  }

  const iap = iapMod!;

  const catalog = await fetchIosSubscriptionProducts();
  if (!catalog.ok) return { ok: false, error: catalog.error };
  if (!catalog.productIds.includes(productId)) {
    return {
      ok: false,
      error: `The ${planId} plan (${productId}) is not available from the App Store. Check subscription setup in App Store Connect.`,
    };
  }

  await runNativeOperation(async () => {
    await Promise.race([
      iap.fetchProducts({ skus: [productId], type: 'subs' }),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  }).catch(() => undefined);

  return new Promise<IapPurchaseResult>((resolve) => {
    const timer = setTimeout(() => {
      if (pending) clearPending({ ok: false, error: 'Purchase timed out. Please try again.' });
    }, 120000);

    const pollTimer = setInterval(() => {
      void pollForCompletedPurchase(iap, planId);
    }, 2500);

    pending = {
      productId,
      planId,
      settle: resolve,
      timer,
      pollTimer,
    };

    const onAppActive = (state: string) => {
      if (state === 'active' && pending) {
        void pollForCompletedPurchase(iap, planId);
      }
    };
    const appSub = AppState.addEventListener('change', onAppActive);

    const finishPoll = () => appSub.remove();

    const originalSettle = pending.settle;
    pending.settle = (result) => {
      finishPoll();
      originalSettle(result);
    };

    void waitUntilNativeIdle().then(() => {
      InteractionManager.runAfterInteractions(() => {
        void iap.requestPurchase({
          type: 'subs',
          request: { apple: { sku: productId } },
        }).catch((e) => {
          if (!pending) return;
          const msg = e instanceof Error ? e.message : 'Could not open App Store purchase sheet.';
          if (/cancel/i.test(msg)) {
            clearPending({ ok: false, error: 'Purchase cancelled.', cancelled: true });
            return;
          }
          void pollForCompletedPurchase(iap, planId).finally(() => {
            if (!pending) return;
            clearPending({
              ok: false,
              error: msg || 'App Store purchase could not start. Confirm sandbox account is signed in under Settings → App Store.',
            });
          });
        });
      });
    });
  });
}
