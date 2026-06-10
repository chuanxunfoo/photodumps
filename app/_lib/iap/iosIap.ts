import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isExpoGo } from '../stripe/nativeAvailable';
import type { StripePlanId } from '../stripe/plans';

const ALL_PLAN_IDS: StripePlanId[] = ['weekly', 'monthly', 'yearly'];

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

/** Restore App Store subscriptions for the current Apple ID. */
export async function restoreIosPurchases(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isIosIapAvailable()) {
    return { ok: false, error: 'Restore is available on iOS builds only.' };
  }

  const iap = await import('react-native-iap');
  const { initConnection, endConnection, getAvailablePurchases } = iap;

  try {
    await initConnection();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'App Store is unavailable right now. Try again.',
    };
  }

  try {
    const skus = allConfiguredIapSkus();
    const purchases = await getAvailablePurchases();
    const active = purchases.some(p => {
      const id = String(p.productId ?? '').trim();
      return skus.includes(id);
    });
    if (!active) {
      return { ok: false, error: 'No active photodumps Pro subscription found for this Apple ID.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not restore purchases.' };
  } finally {
    await endConnection();
  }
}

/**
 * Starts true App Store subscription flow (StoreKit sheet with app icon).
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
        `Wrong ID for App Store: "${productId}" is a Stripe ID. In app/.env use each subscription's Product ID from App Store Connect (looks like com.yourname.dumpitapp.pro.monthly), then run a new EAS build.`,
    };
  }

  const iap = await import('react-native-iap');
  const {
    initConnection,
    endConnection,
    fetchProducts,
    requestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
  } = iap;

  try {
    await initConnection();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'App Store is unavailable right now. Try again.',
    };
  }

  try {
    const skus = allConfiguredIapSkus();
    const query = skus.length > 0 ? skus : [productId];

    const loadStoreProducts = async () => {
      const merged: { id?: string; productId?: string }[] = [];
      for (const type of ['subs', 'all'] as const) {
        try {
          const batch = await fetchProducts({ skus: query, type });
          if (Array.isArray(batch)) merged.push(...batch);
        } catch {
          /* try next query type */
        }
      }
      return merged;
    };

    let list: { id?: string; productId?: string }[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      list = await loadStoreProducts();
      if (list.some(p => productSku(p) === productId)) break;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }

    const exists = list.some(p => productSku(p) === productId);
    const returned = list.map(productSku).filter(Boolean);
    const storeKitHint =
      returned.length > 0
        ? ` StoreKit returned: ${returned.join(', ')}.`
        : ' StoreKit returned no subscriptions yet.';

    // Sandbox sometimes omits fetchProducts until purchase — still try the sheet.
    if (!exists && __DEV__) {
      console.warn('[iap] prefetch miss', { productId, query, returned });
    }

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
        if (!exists && /not available|not found|invalid product|sku/i.test(msg)) {
          settle({
            ok: false,
            error:
              `App Store did not return "${productId}".${storeKitHint} Check: Paid Apps Agreement active, sandbox tester country matches subscription pricing, subscriptions on iOS 1.0. Configured: ${query.join(', ')}`,
          });
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
        const raw = e instanceof Error ? e.message : 'Could not open App Store purchase sheet.';
        if (!exists) {
          settle({
            ok: false,
            error:
              `App Store did not return "${productId}".${storeKitHint} ${raw} Configured: ${query.join(', ')}`,
          });
          return;
        }
        settle({ ok: false, error: raw });
      });
    });

    return result;
  } finally {
    await endConnection();
  }
}
