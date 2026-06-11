import { router } from 'expo-router';
import { InteractionManager } from 'react-native';

import { markPaywallExit } from './launchStability';

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

/**
 * After subscription / onboarding paywall — wait for modal teardown, then enter hub.
 * Prevents TurboModule races between subscription stack and hub/calendar mounts.
 */
export function safeReplaceAfterPaywall(href: Href) {
  markPaywallExit();
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      try {
        router.replace(href);
      } catch {
        setTimeout(() => router.replace(href), 80);
      }
    }, 900);
  });
}
