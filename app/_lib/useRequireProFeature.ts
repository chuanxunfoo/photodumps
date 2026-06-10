import { type Href, router, useFocusEffect } from 'expo-router';

import { useCallback } from 'react';

import { InteractionManager } from 'react-native';



import { useTheme } from '../(tabs)/ThemeContext';



/**

 * Blocks Hobby users who deep-link into a Pro-only screen.

 * Sends them to the subscription page (no blank pro screen flash).

 */

export function useRequireProFeature(): boolean {

  const { isPro, isAdmin } = useTheme();

  const allowed = isPro || isAdmin;



  useFocusEffect(

    useCallback(() => {

      if (allowed) return;

      InteractionManager.runAfterInteractions(() => {

        try {

          router.replace('/subscription' as Href);

        } catch {

          setTimeout(() => router.replace('/subscription' as Href), 50);

        }

      });

    }, [allowed]),

  );



  return allowed;

}


