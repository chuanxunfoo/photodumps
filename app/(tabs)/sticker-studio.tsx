import React, { useEffect, useState } from 'react';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { ScreenBootShell } from '../_lib/ScreenBootShell';

/** Instant shell — heavy sticker studio loads in background. */
export default function StickerStudioRoute() {
  const goBack = useExploreAwareBack('features');
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('./sticker-studio-screen').then((m) => {
      if (!cancelled) setScreen(() => m.default);
    });
    return () => { cancelled = true; };
  }, []);

  if (!Screen) {
    return <ScreenBootShell title="Sticker studio" onBack={goBack} />;
  }
  return <Screen />;
}
