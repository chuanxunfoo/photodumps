import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isExpoGo } from '../stripe/nativeAvailable';

type AdExtras = {
  EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?: string;
  EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID?: string;
};

export type AdShowResult = { ok: true } | { ok: false; error: string };

let initOnce: Promise<void> | null = null;
let showingInterstitial = false;
let showingRewarded = false;

const AD_LOAD_TIMEOUT_MS = 20000;

type MobileAdsMod = typeof import('react-native-google-mobile-ads');

async function getAdsModule(): Promise<MobileAdsMod | null> {
  if (Platform.OS !== 'ios') return null;
  if (isExpoGo()) return null;
  try {
    return await import('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function getExtras(): AdExtras {
  return (Constants.expoConfig?.extra as AdExtras | undefined) ?? {};
}

function interstitialUnitId(mod: MobileAdsMod): string {
  if (Platform.OS !== 'ios') return mod.TestIds.INTERSTITIAL;
  const envId =
    getExtras().EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID ??
    process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID;
  return envId?.trim() || mod.TestIds.INTERSTITIAL;
}

function rewardedUnitId(mod: MobileAdsMod): string {
  if (Platform.OS !== 'ios') return mod.TestIds.REWARDED;
  const envId =
    getExtras().EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID ??
    process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID;
  return envId?.trim() || mod.TestIds.REWARDED;
}

export async function initMobileAds(): Promise<void> {
  const mod = await getAdsModule();
  if (!mod) return;
  if (!initOnce) {
    initOnce = mod.mobileAds()
      .initialize()
      .then(() => {})
      .catch((e) => {
        console.warn('[admob] init skipped', e);
        initOnce = null;
      });
  }
  return initOnce;
}

/** Warm the next rewarded ad so spin wheel / swipe bonus opens faster. */
export async function preloadRewardedAd(): Promise<void> {
  const mod = await getAdsModule();
  if (!mod) return;
  await initMobileAds();
  try {
    const ad = mod.RewardedAd.createForAdRequest(rewardedUnitId(mod));
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const onLoaded = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
          onLoaded();
          onError();
          resolve();
        });
        const onError = ad.addAdEventListener(mod.AdEventType.ERROR, () => {
          onLoaded();
          onError();
          reject(new Error('preload failed'));
        });
        ad.load();
      }),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('preload timeout')), AD_LOAD_TIMEOUT_MS);
      }),
    ]).catch(() => undefined);
  } catch {
    /* best-effort preload */
  }
}

export async function showInterstitialAd(): Promise<boolean> {
  const result = await showInterstitialAdDetailed();
  return result.ok;
}

export async function showInterstitialAdDetailed(): Promise<AdShowResult> {
  if (showingInterstitial) return { ok: false, error: 'An ad is already playing.' };
  const mod = await getAdsModule();
  if (!mod) {
    return { ok: false, error: 'Ads are available in the iOS app build only.' };
  }
  await initMobileAds();
  showingInterstitial = true;
  try {
    const ad = mod.InterstitialAd.createForAdRequest(interstitialUnitId(mod));
    return await Promise.race([
      new Promise<AdShowResult>((resolve) => {
        const cleanup: (() => void)[] = [];
        const finish = (result: AdShowResult) => {
          cleanup.forEach((fn) => fn());
          resolve(result);
        };
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.LOADED, () => {
            ad.show();
          }),
        );
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
            finish({ ok: true });
          }),
        );
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.ERROR, () => {
            finish({
              ok: false,
              error: 'No ad available right now. AdMob can take a few hours after setup — try again later.',
            });
          }),
        );
        ad.load();
      }),
      new Promise<AdShowResult>((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: false,
              error: 'Ad took too long to load. Check your connection and try again.',
            }),
          AD_LOAD_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    showingInterstitial = false;
  }
}

export async function showRewardedAd(onReward: () => Promise<void> | void): Promise<boolean> {
  const result = await showRewardedAdDetailed(onReward);
  return result.ok;
}

export async function showRewardedAdDetailed(
  onReward: () => Promise<void> | void,
): Promise<AdShowResult> {
  if (showingRewarded) return { ok: false, error: 'An ad is already playing.' };
  const mod = await getAdsModule();
  if (!mod) {
    return { ok: false, error: 'Rewarded ads work in the iOS TestFlight / App Store build only.' };
  }
  await initMobileAds();
  showingRewarded = true;
  try {
    const ad = mod.RewardedAd.createForAdRequest(rewardedUnitId(mod));
    return await Promise.race([
      new Promise<AdShowResult>((resolve) => {
        let rewarded = false;
        const cleanup: (() => void)[] = [];
        const finish = (result: AdShowResult) => {
          cleanup.forEach((fn) => fn());
          resolve(result);
        };
        cleanup.push(
          ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, async () => {
            rewarded = true;
            await onReward();
          }),
        );
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.LOADED, () => {
            ad.show();
          }),
        );
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
            if (rewarded) finish({ ok: true });
            else finish({ ok: false, error: 'Watch the full ad to earn your spin.' });
          }),
        );
        cleanup.push(
          ad.addAdEventListener(mod.AdEventType.ERROR, () => {
            finish({
              ok: false,
              error:
                'No rewarded ad loaded. New AdMob ad units can take up to 24 hours to serve. Try again later or check AdMob → Apps → photodumps.',
            });
          }),
        );
        ad.load();
      }),
      new Promise<AdShowResult>((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: false,
              error: 'Ad took too long to load. Check your connection and try again.',
            }),
          AD_LOAD_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    showingRewarded = false;
  }
}
