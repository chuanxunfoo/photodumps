import Constants from 'expo-constants';

export function getStripePublishableKey(): string {
  const extra = Constants.expoConfig?.extra as { EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string } | undefined;
  return (
    extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    ''
  ).trim();
}

export function getStripeMerchantId(): string {
  const extra = Constants.expoConfig?.extra as { EXPO_PUBLIC_STRIPE_MERCHANT_ID?: string } | undefined;
  return (
    extra?.EXPO_PUBLIC_STRIPE_MERCHANT_ID ??
    process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ??
    'merchant.com.yourname.dumpitapp'
  ).trim();
}
