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
  if (isExpoGo()) return false;
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const flag = extra?.EXPO_PUBLIC_NATIVE_CUTOUT;
  if (flag === '0' || flag === false) return false;
  if (flag === '1' || flag === true) {
    return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  }
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function expoGoCutoutHint(): string {
  if (nativeCutoutBundled()) {
    return 'On-device cutout is enabled — use a dev build on your phone for the fastest results.';
  }
  return 'Expo Go uses slower in-browser AI. Run npm run ios (Apple Developer build) for 1–4 second on-device cutout.';
}
