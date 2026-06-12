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

export function appleAuthUnavailableReason(): string | null {
  if (Platform.OS !== 'ios') return 'Sign in with Apple is iOS-only.';
  if (isExpoGo()) {
    return 'Native Apple Sign In needs a TestFlight or App Store build — not Expo Go. Install the latest TestFlight build.';
  }
  if (!isNativeAppleAuthLinked()) {
    const env = Constants.executionEnvironment ?? 'unknown';
    return `Apple Sign In native module is missing (runtime: ${env}). Reinstall the latest TestFlight build.`;
  }
  return null;
}
