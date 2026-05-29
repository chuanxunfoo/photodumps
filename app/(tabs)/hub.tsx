import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { CalendarScreen } from './calendar';
import HubFeaturesPage from '../components/hub/HubFeaturesPage';
import HubGeneralsPage from '../components/hub/HubGeneralsPage';
import { HubPager, type HubPagerHandle } from '../components/hub/HubPager';
import { useTheme } from './ThemeContext';

function pageToIndex(page?: string): number {
  if (page === 'features') return 1;
  if (page === 'generals') return 2;
  return 0;
}

let launchSubPrompted = false;

export default function HubScreen() {
  const { theme, isPro, isAdmin, user, openSubscription } = useTheme();
  const params = useLocalSearchParams<{ page?: string }>();
  const pagerRef = useRef<HubPagerHandle>(null);
  const initialIndex = pageToIndex(params.page);
  const [pageIndex, setPageIndex] = useState(initialIndex);

  useFocusEffect(
    useCallback(() => {
      const i = pageToIndex(params.page);
      setPageIndex(i);
      pagerRef.current?.scrollToIndex(i, false);
    }, [params.page]),
  );

  /** Once per app launch: signed-in Hobby users see subscription on app entry. */
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || isPro || isAdmin || launchSubPrompted) return;
      let cancelled = false;
      launchSubPrompted = true;
      const t = setTimeout(() => {
        if (!cancelled) openSubscription();
      }, 1200);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }, [user?.uid, isPro, isAdmin, openSubscription]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <HubPager ref={pagerRef} initialIndex={initialIndex} onIndexChange={setPageIndex}>
        <CalendarScreen />
        <HubFeaturesPage active={pageIndex === 1} />
        <HubGeneralsPage active={pageIndex === 2} />
      </HubPager>
    </View>
  );
}
