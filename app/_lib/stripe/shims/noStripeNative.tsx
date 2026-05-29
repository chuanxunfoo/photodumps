import React from 'react';

/** Web / Expo Go shim — avoids bundling @stripe/stripe-react-native. */
export function StripeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const PlatformPay = {
  PaymentType: { Recurring: 'Recurring', Immediate: 'Immediate' },
  IntervalUnit: { Week: 'Week', Month: 'Month', Year: 'Year' },
};

export async function isPlatformPaySupported(): Promise<boolean> {
  return false;
}

export async function confirmPlatformPayPayment(): Promise<{ error?: { code?: string; message?: string } }> {
  return { error: { code: 'Unsupported', message: 'Stripe native is not available on web.' } };
}
