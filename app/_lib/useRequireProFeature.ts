import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useTheme } from '../(tabs)/ThemeContext';

/**
 * Blocks Hobby users who deep-link into a Pro-only screen.
 * Pushes subscription (not replace) so back returns cleanly.
 */
export function useRequireProFeature(): boolean {
  const { isPro, isAdmin } = useTheme();
  const allowed = isPro || isAdmin;
  const redirectedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      redirectedRef.current = false;
      if (allowed) return;
      redirectedRef.current = true;
      requestAnimationFrame(() => {
        try {
          router.push('/subscription' as Href);
        } catch {
          setTimeout(() => router.push('/subscription' as Href), 50);
        }
      });
      return () => {
        redirectedRef.current = false;
      };
    }, [allowed]),
  );

  return allowed;
}
