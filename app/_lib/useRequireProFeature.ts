import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { safeReplace } from './safeNavigate';
import { useTheme } from '../(tabs)/ThemeContext';

/**
 * Blocks Hobby users who deep-link into a Pro-only screen.
 * Opens subscription once, then returns to hub Features.
 */
export function useRequireProFeature() {
  const { isPro, isAdmin, openSubscription } = useTheme();

  useFocusEffect(
    useCallback(() => {
      if (isPro || isAdmin) return;
      openSubscription();
      safeReplace('/hub?page=features');
    }, [isPro, isAdmin, openSubscription]),
  );
}
