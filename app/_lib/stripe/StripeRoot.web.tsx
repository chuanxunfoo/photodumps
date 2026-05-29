import React from 'react';

/** Web: Stripe native SDK is unavailable — pass through children. */
export function StripeRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
