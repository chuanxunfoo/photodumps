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

export default function HubScreen() {
  const { theme } = useTheme();
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
