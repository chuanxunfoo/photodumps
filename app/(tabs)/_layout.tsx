import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { recordDailyOpen } from '../_lib/streakLogic';
import { getOrCreateStatsSessionId } from '../_lib/statsSession';
import { useTheme } from './ThemeContext';

export default function TabsLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => {
      void recordDailyOpen();
      void getOrCreateStatsSessionId();
    }, 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
          contentStyle: { backgroundColor: theme.bg },
          animation: 'shift',
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen name="hub" />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="dump" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="email-clean" options={{ href: null }} />
        <Tabs.Screen name="onboarding" options={{ href: null }} />
        <Tabs.Screen name="auth" options={{ href: null }} />
        <Tabs.Screen name="subscribe" options={{ href: null }} />
        <Tabs.Screen name="subscription" options={{ href: null, animation: 'none' }} />
        <Tabs.Screen name="payment" options={{ href: null }} />
        <Tabs.Screen name="duplicates" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="deep-clean" options={{ href: null }} />
        <Tabs.Screen name="spin-wheel" options={{ href: null }} />
        <Tabs.Screen name="photobooth" options={{ href: null }} />
        <Tabs.Screen name="photobooth-gallery" options={{ href: null }} />
        <Tabs.Screen name="sticker-studio" options={{ href: null, animation: 'none' }} />
        <Tabs.Screen name="account-sign-in" options={{ href: null, animation: 'none' }} />
        <Tabs.Screen name="widgets" options={{ href: null }} />
        <Tabs.Screen name="widget-editor" options={{ href: null }} />
        <Tabs.Screen name="explore-trim" options={{ href: null, animation: 'none' }} />
        <Tabs.Screen name="explore-rate" options={{ href: null }} />
        <Tabs.Screen name="explore-faq" options={{ href: null }} />
        <Tabs.Screen name="explore-legal-terms" options={{ href: null }} />
        <Tabs.Screen name="explore-legal-privacy" options={{ href: null }} />
        <Tabs.Screen name="explore-bookmarks" options={{ href: null }} />
        <Tabs.Screen name="streak" options={{ href: null }} />
        <Tabs.Screen name="supercut" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </>
  );
}
