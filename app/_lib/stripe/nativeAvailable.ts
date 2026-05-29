import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go has no Stripe native module — causes NativeEventEmitter crash if imported. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

export function isStripeNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  return true;
}

export const EXPO_GO_STRIPE_MSG =
  'Apple Pay needs a development build, not Expo Go. Run: npm run start:dev-client (after npm run ios or eas build).';
