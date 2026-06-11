import { type Href, router, useRouter, useLocalSearchParams } from 'expo-router';

import { useCallback } from 'react';

import { InteractionManager } from 'react-native';



/** Tab routes opened from a hub swipe page. */

export type HubChildRoute =

  | '/settings'

  | '/explore-bookmarks'

  | '/notifications'

  | '/explore-faq'

  | '/explore-rate'

  | '/spin-wheel'

  | '/explore-legal-terms'

  | '/explore-legal-privacy'

  | '/duplicates'

  | '/explore-trim'

  | '/supercut'

  | '/insights'

  | '/sticker-studio'

  | '/widgets'

  | '/email-clean'

  | '/widget-editor'

  | '/photobooth'

  | '/photobooth-gallery'
  | '/account-sign-in';



/** @deprecated Use HUB_FROM — kept for legacy deep links */

export const EXPLORE_FROM = 'explore' as const;



export type HubPage = 'calendar' | 'features' | 'generals';



export const HUB_FROM = {

  calendar: 'calendar',

  features: 'features',

  generals: 'generals',

  explore: 'explore',

} as const;



export function hubChildParams(page: HubPage) {

  return { from: page } as const;

}



/** @deprecated Use hubChildParams */

export function exploreChildParams() {

  return hubChildParams('generals');

}



function hubHref(page: HubPage) {

  return { pathname: '/hub' as const, params: { page } };

}



function isHubPage(raw?: string): raw is HubPage {

  return raw === HUB_FROM.calendar || raw === HUB_FROM.features || raw === HUB_FROM.generals;

}



/** Push a tab screen and remember which hub page to return to. */

export function hubPush(pathname: HubChildRoute, page: HubPage) {

  const href = { pathname, params: { from: page } } as Href;

  router.push(href);

}



function popOrReplaceHub(page: HubPage, routerRef: ReturnType<typeof useRouter>) {

  InteractionManager.runAfterInteractions(() => {

    if (routerRef.canGoBack()) {

      routerRef.back();

      return;

    }

    routerRef.replace(hubHref(page));

  });

}



/** Return to the hub swipe page that opened this screen. */

export function useExploreAwareBack(fallback: HubPage = 'generals') {

  const routerRef = useRouter();

  const params = useLocalSearchParams<{ from?: string }>();

  return useCallback(() => {

    const raw = params.from;

    if (isHubPage(raw)) {

      popOrReplaceHub(raw, routerRef);

      return;

    }

    if (raw === EXPLORE_FROM || raw === HUB_FROM.explore) {

      popOrReplaceHub('generals', routerRef);

      return;

    }

    if (routerRef.canGoBack()) {

      routerRef.back();

      return;

    }

    routerRef.replace(hubHref(fallback));

  }, [params.from, fallback, routerRef]);

}



export function useHubAwareBack(fallback: HubPage = 'generals') {

  return useExploreAwareBack(fallback);

}


