import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isExpoGo } from '../stripe/nativeAvailable';
import type { StripePlanId } from '../stripe/plans';

const ALL_PLAN_IDS: StripePlanId[] = ['weekly', 'monthly', 'yearly'];

let connectionReady: Promise<void> | null = null;
let connectionOpen = false;

function productSku(p: { id?: string; productId?: string }): string {
  return String(p.productId ?? p.id ?? '').trim();
}

type IapPurchaseResult =
  | { ok: true; productId: string }
  | { ok: false; error: string; cancelled?: boolean };

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

/** Keep StoreKit connected so the purchase sheet can appear instantly on tap. */
export async function warmIosIapConnection(): Promise<void> {
  if (!isIosIapAvailable()) return;
  if (connectionOpen) return;
  if (!connectionReady) {
    connectionReady = (async () => {
      const iap = await import('react-native-iap');
      await iap.initConnection();
      connectionOpen = true;
    })().catch((e) => {
      connectionReady = null;
      connectionOpen = false;
      throw e;
    });
  }
  await connectionReady;
}

async function ensureIapConnected(): Promise<typeof import('react-native-iap')> {
  await warmIosIapConnection();
  return import('react-native-iap');
}

/** Restore App Store subscriptions for the current Apple ID. */
export async function restoreIosPurchases(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'Restore is available on iOS builds only.' };
  }

  try {
    const iap = await ensureIapConnected();
    const skus = allConfiguredIapSkus();
    const purchases = await iap.getAvailablePurchases();
    const active = purchases.some((p) => {
      const id = String(p.productId ?? '').trim();
      return skus.includes(id);
    });
    if (!active) {
      return { ok: false, error: 'No active photodumps Pro subscription found for this Apple ID.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not restore purchases.' };
  }
}

/**
 * Opens the native App Store subscription sheet immediately (no long prefetch wait).
 */
export async function purchaseIosSubscription(planId: StripePlanId): Promise<IapPurchaseResult> {
  if (Platform.OS !== 'ios') return { ok: false, error: 'App Store subscription is iOS-only.' };
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'App Store purchase needs a dev/prod iOS build, not Expo Go.' };
  }

  const productId = getIapProductId(planId);
  if (!productId) {
    return {
      ok: false,
      error: `Missing EXPO_PUBLIC_IOS_IAP_${planId.toUpperCase()}_PRODUCT_ID in app/.env.`,
    };
  }
  if (/^(prod_|price_)/i.test(productId)) {
    return {
      ok: false,
      error:
        `Wrong ID for App Store: "${productId}" is a Stripe ID. Use each subscription's Product ID from App Store Connect (e.g. com.yourname.dumpitapp.pro.monthly).`,
    };
  }

  let iap: Awaited<ReturnType<typeof ensureIapConnected>>;
  try {
    iap = await ensureIapConnected();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'App Store is unavailable right now. Try again.',
    };
  }

  const {
    fetchProducts,
    requestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
  } = iap;

  const skus = allConfiguredIapSkus();
  const query = skus.length > 0 ? skus : [productId];

  // Best-effort cache warm — never block the purchase sheet on this.
  void fetchProducts({ skus: query, type: 'subs' }).catch(() => undefined);

  const result = await new Promise<IapPurchaseResult>((resolve) => {
    let done = false;

    const cleanup = () => {
      purchaseSub.remove();
      errorSub.remove();
    };
    const settle = (value: IapPurchaseResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve(value);
    };

    const purchaseSub = purchaseUpdatedListener(async (purchase) => {
      const purchasedId = purchase.productId || purchase.currentPlanId;
      if (purchasedId !== productId) return;
      if (purchase.purchaseState !== 'purchased') return;
      try {
        await finishTransaction({ purchase, isConsumable: false });
        settle({ ok: true, productId });
      } catch (e) {
        settle({ ok: false, error: e instanceof Error ? e.message : 'Could not finalize App Store purchase.' });
      }
    });

    const errorSub = purchaseErrorListener((error) => {
      const msg = error.message || 'Purchase failed.';
      if (error.code === 'user-cancelled') {
        settle({ ok: false, error: 'Purchase cancelled.', cancelled: true });
        return;
      }
      settle({ ok: false, error: msg });
    });

    const timer = setTimeout(() => {
      settle({ ok: false, error: 'Purchase timed out. Please try again.' });
    }, 120000);

    void requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: productId },
      },
    }).catch((e) => {
      settle({
        ok: false,
        error: e instanceof Error ? e.message : 'Could not open App Store purchase sheet.',
      });
    });
  });

  return result;
}
