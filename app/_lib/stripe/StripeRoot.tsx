import React from 'react';

import { getStripeMerchantId, getStripePublishableKey } from './keys';
import { isStripeNativeAvailable } from './nativeAvailable';

export function StripeRoot({ children }: { children: React.ReactNode }) {
  const publishableKey = getStripePublishableKey();

  if (!isStripeNativeAvailable() || !publishableKey) {
    return <>{children}</>;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StripeProvider } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier={getStripeMerchantId()}
      urlScheme="dumpit"
    >
      {children}
    </StripeProvider>
  );
}
