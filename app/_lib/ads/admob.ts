import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isExpoGo } from '../stripe/nativeAvailable';

type AdExtras = {
  EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?: string;
  EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID?: string;
};

let initOnce: Promise<void> | null = null;
let showingInterstitial = false;
let showingRewarded = false;

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
      .then(() => {});
  }
  return initOnce;
}

export async function showInterstitialAd(): Promise<boolean> {
  if (showingInterstitial) return false;
  const mod = await getAdsModule();
  if (!mod) return false;
  await initMobileAds();
  showingInterstitial = true;
  try {
    const ad = mod.InterstitialAd.createForAdRequest(interstitialUnitId(mod));
    return await new Promise<boolean>((resolve) => {
      const onLoaded = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
        ad.show();
      });
      const onClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
        onLoaded();
        onClosed();
        onError();
        resolve(true);
      });
      const onError = ad.addAdEventListener(mod.AdEventType.ERROR, () => {
        onLoaded();
        onClosed();
        onError();
        resolve(false);
      });
      ad.load();
    });
  } finally {
    showingInterstitial = false;
  }
}

export async function showRewardedAd(onReward: () => Promise<void> | void): Promise<boolean> {
  if (showingRewarded) return false;
  const mod = await getAdsModule();
  if (!mod) return false;
  await initMobileAds();
  showingRewarded = true;
  try {
    const ad = mod.RewardedAd.createForAdRequest(rewardedUnitId(mod));
    return await new Promise<boolean>((resolve) => {
      let rewarded = false;
      const onRewarded = ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, async () => {
        rewarded = true;
        await onReward();
      });
      const onLoaded = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
        ad.show();
      });
      const onClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
        onRewarded();
        onLoaded();
        onClosed();
        onError();
        resolve(rewarded);
      });
      const onError = ad.addAdEventListener(mod.AdEventType.ERROR, () => {
        onRewarded();
        onLoaded();
        onClosed();
        onError();
        resolve(false);
      });
      ad.load();
    });
  } finally {
    showingRewarded = false;
  }
}
