import Constants from 'expo-constants';
import { InteractionManager, Platform } from 'react-native';

import { markNativeQuiet, runNativeOperation } from '../launchStability';
import { isExpoGo } from '../stripe/nativeAvailable';
import type { StripePlanId } from '../stripe/plans';

const ALL_PLAN_IDS: StripePlanId[] = ['weekly', 'monthly', 'yearly'];

type IapPurchaseResult =
  | { ok: true; productId: string }
  | { ok: false; error: string; cancelled?: boolean };

type PendingPurchase = {
  productId: string;
  settle: (result: IapPurchaseResult) => void;
  timer: ReturnType<typeof setTimeout>;
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

function clearPending(result: IapPurchaseResult) {
  if (!pending) return;
  clearTimeout(pending.timer);
  const settle = pending.settle;
  pending = null;
  settle(result);
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
    try {
      await iap.finishTransaction({ purchase, isConsumable: false });
    } catch (e) {
      console.warn('[iap] finishTransaction failed', e);
    }
    clearPending({ ok: true, productId });
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

/** Boot StoreKit when subscription screen opens — never at app launch. */
export async function bootIapManager(): Promise<void> {
  if (!isIosIapAvailable()) return;
  if (bootPromise) return bootPromise;

  markNativeQuiet(3000);
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

  await runNativeOperation(async () => {
    await Promise.race([
      iap.fetchProducts({ skus: [productId], type: 'subs' }),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
  }).catch(() => undefined);

  return new Promise<IapPurchaseResult>((resolve) => {
    const timer = setTimeout(() => {
      if (pending) clearPending({ ok: false, error: 'Purchase timed out. Please try again.' });
    }, 120000);

    pending = {
      productId,
      settle: resolve,
      timer,
    };

    InteractionManager.runAfterInteractions(() => {
      void iap.requestPurchase({
        type: 'subs',
        request: { apple: { sku: productId } },
      }).catch((e) => {
        if (!pending) return;
        clearPending({
          ok: false,
          error: e instanceof Error ? e.message : 'Could not open App Store purchase sheet.',
        });
      });
    });
  });
}
