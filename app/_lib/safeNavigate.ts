import { router } from 'expo-router';
import { InteractionManager } from 'react-native';

type Href = Parameters<typeof router.replace>[0];

/** Defer navigation until the root navigator has mounted (avoids expo-router race on cold start). */
export function safeReplace(href: Href) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      try {
        router.replace(href);
      } catch {
        setTimeout(() => router.replace(href), 50);
      }
    }, 0);
  });
}
