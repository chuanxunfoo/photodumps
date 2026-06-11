import React, { useEffect, useState } from 'react';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { ScreenBootShell } from '../_lib/ScreenBootShell';

/** Instant shell — heavy video editor loads in background. */
export default function ExploreTrimRoute() {
  const goBack = useExploreAwareBack('features');
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('./explore-trim-screen').then((m) => {
      if (!cancelled) setScreen(() => m.default);
    });
    return () => { cancelled = true; };
  }, []);

  if (!Screen) {
    return <ScreenBootShell title="Video trim" onBack={goBack} />;
  }
  return <Screen />;
}
