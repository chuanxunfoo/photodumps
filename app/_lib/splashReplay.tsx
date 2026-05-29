import React, { createContext, useContext } from 'react';

type SplashReplayContextValue = {
  replaySplash: (onFinished?: () => void) => void;
};

export const SplashReplayContext = createContext<SplashReplayContextValue>({
  replaySplash: () => {},
});

export function useSplashReplay() {
  return useContext(SplashReplayContext);
}
