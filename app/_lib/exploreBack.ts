import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

/** Query value for `from` when opening a screen from Explore. */
export const EXPLORE_FROM = 'explore' as const;

export function exploreChildParams() {
  return { from: EXPLORE_FROM } as const;
}

/** Prefer Explore when this screen was opened from Explore; otherwise normal stack back. */
export function useExploreAwareBack() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  return useCallback(() => {
    if (params.from === EXPLORE_FROM) {
      router.replace('/explore');
    } else {
      router.back();
    }
  }, [params.from, router]);
}
