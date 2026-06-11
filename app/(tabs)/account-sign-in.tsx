import React, { useEffect, useState } from 'react';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { ScreenBootShell } from '../_lib/ScreenBootShell';

/** Zero native imports — Apple auth loads only inside account-sign-in-screen. */
export default function AccountSignInRoute() {
  const goBack = useExploreAwareBack('generals');
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void import('./account-sign-in-screen').then((m) => {
        if (!cancelled) setScreen(() => m.default);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!Screen) {
    return <ScreenBootShell title="Account" onBack={goBack} />;
  }
  return <Screen />;
}
