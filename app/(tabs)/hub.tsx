import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { HubPager, type HubPagerHandle } from '../components/hub/HubPager';
import { isHubReadyForSidePages, markHubEntered } from '../_lib/launchStability';
import { useTheme } from './ThemeContext';

function pageToIndex(page?: string): number {
  if (page === 'features') return 1;
  if (page === 'generals') return 2;
  return 0;
}

type PageComponent = React.ComponentType<{ active?: boolean }>;

function PagePlaceholder() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}

export default function HubScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ page?: string }>();
  const pagerRef = useRef<HubPagerHandle>(null);
  const initialIndex = pageToIndex(params.page);
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const [CalendarScreen, setCalendarScreen] = useState<PageComponent | null>(null);
  const [FeaturesPage, setFeaturesPage] = useState<PageComponent | null>(null);
  const [GeneralsPage, setGeneralsPage] = useState<PageComponent | null>(null);
  const hubMarkedRef = useRef(false);

  useEffect(() => {
    if (!hubMarkedRef.current) {
      hubMarkedRef.current = true;
      markHubEntered();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void import('./calendar').then((m) => {
        if (!cancelled) setCalendarScreen(() => m.CalendarScreen);
      });
    }, 6000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  /** Side pages load only when user swipes there AND hub has been stable 10s+. */
  useEffect(() => {
    if (pageIndex < 1 || FeaturesPage) return;
    if (!isHubReadyForSidePages()) {
      const poll = setInterval(() => {
        if (isHubReadyForSidePages()) {
          clearInterval(poll);
          void import('../components/hub/HubFeaturesPage').then((m) => setFeaturesPage(() => m.default));
        }
      }, 500);
      return () => clearInterval(poll);
    }
    void import('../components/hub/HubFeaturesPage').then((m) => setFeaturesPage(() => m.default));
  }, [pageIndex, FeaturesPage]);

  useEffect(() => {
    if (pageIndex < 2 || GeneralsPage) return;
    if (!isHubReadyForSidePages()) {
      const poll = setInterval(() => {
        if (isHubReadyForSidePages()) {
          clearInterval(poll);
          void import('../components/hub/HubGeneralsPage').then((m) => setGeneralsPage(() => m.default));
        }
      }, 500);
      return () => clearInterval(poll);
    }
    void import('../components/hub/HubGeneralsPage').then((m) => setGeneralsPage(() => m.default));
  }, [pageIndex, GeneralsPage]);

  useFocusEffect(
    useCallback(() => {
      const i = pageToIndex(params.page);
      setPageIndex(i);
      pagerRef.current?.scrollToIndex(i, false);
    }, [params.page]),
  );

  const calendarNode = CalendarScreen ? <CalendarScreen /> : <PagePlaceholder />;
  const featuresNode = FeaturesPage ? <FeaturesPage active={pageIndex === 1} /> : <PagePlaceholder />;
  const generalsNode = GeneralsPage ? <GeneralsPage active={pageIndex === 2} /> : <PagePlaceholder />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <HubPager ref={pagerRef} initialIndex={initialIndex} onIndexChange={setPageIndex}>
        {calendarNode}
        {featuresNode}
        {generalsNode}
      </HubPager>
    </View>
  );
}
