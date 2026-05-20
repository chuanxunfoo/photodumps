import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True when running inside the Expo Go app (StoreClient). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Metro bundles real native cutout only when EXPO_PUBLIC_NATIVE_CUTOUT=1 at start.
 * Store / dev-client builds should enable via eas.json, `expo run:*`, or .env.
 */
export function nativeCutoutBundled(): boolean {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const flag = extra?.EXPO_PUBLIC_NATIVE_CUTOUT;
  if (flag === '1' || flag === true) return true;
  if (flag === '0' || flag === false) return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function expoGoCutoutHint(): string {
  if (nativeCutoutBundled()) return '';
  return 'Expo Go uses free on-device AI cutout (Wi‑Fi for first run). Cloud API is skipped to avoid rate limits.';
}
