import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { isExpoGo } from './stripe/nativeAvailable';

/** True when ExpoAppleAuthentication native module is in the binary (not the JS stub). */
export function isNativeAppleAuthLinked(): boolean {
  if (Platform.OS !== 'ios') return false;
  const mod = requireOptionalNativeModule('ExpoAppleAuthentication') as
    | { requestAsync?: unknown }
    | null;
  return typeof mod?.requestAsync === 'function';
}

/** Async probe — more reliable than sync requireOptionalNativeModule on some builds. */
export async function isNativeAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (isNativeAppleAuthLinked()) return true;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function appleAuthUnavailableReason(): string | null {
  if (Platform.OS !== 'ios') return 'Sign in with Apple is iOS-only.';
  if (isExpoGo()) {
    return 'Sign in with Apple is not available in Expo Go. Install photodumps from TestFlight.';
  }
  if (!isNativeAppleAuthLinked()) {
    const build =
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.nativeAppVersion ??
      'unknown';
    return `Apple Sign In is unavailable in this build (${build}). Install the latest TestFlight build and try again.`;
  }
  return null;
}
