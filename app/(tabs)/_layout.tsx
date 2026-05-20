import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './ThemeContext';
import { createSessionFromUrl } from './authOAuth';
import { supabase } from './supabase';
import { safeReplace } from '../_lib/safeNavigate';
import { recordDailyOpen } from '../_lib/streakLogic';
import { getOrCreateStatsSessionId } from '../_lib/statsSession';
import type { UserProfile } from './ThemeContext';

function DeepLinkHandler() {
  const { setUser } = useTheme();
  const router = useRouter();

  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) handleAuthURL(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthURL(url));
    return () => sub.remove();
  }, []);

  const handleAuthURL = async (url: string) => {
    if (!url || !url.includes('auth-callback')) return;
    try {
      const session = await createSessionFromUrl(url);
      if (!session) return;
      const u = session.user;
      const meta = u.user_metadata as { username?: string } | undefined;
      const profile: UserProfile = {
        uid: u.id,
        email: u.email ?? '',
        username: meta?.username ?? u.email?.split('@')[0] ?? 'user',
        isLoggedIn: true,
      };
      await setUser(profile);
      const onboard = await AsyncStorage.getItem('@dumpit_onboard');
      safeReplace(onboard ? '/hub' : '/onboarding');
    } catch (e) {
      console.warn('Deep link auth error:', e);
    }
  };

  return null;
}

function TabsLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.bg);
  }, [theme.bg]);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="hub" />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="dump" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="onboarding" options={{ href: null }} />
        <Tabs.Screen name="auth" options={{ href: null }} />
        <Tabs.Screen name="landing" options={{ href: null }} />
        <Tabs.Screen name="subscribe" options={{ href: null }} />
        <Tabs.Screen name="payment" options={{ href: null }} />
        <Tabs.Screen name="duplicates" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="deep-clean" options={{ href: null }} />
        <Tabs.Screen name="spin-wheel" options={{ href: null }} />
        <Tabs.Screen name="photobooth" options={{ href: null }} />
        <Tabs.Screen name="photobooth-gallery" options={{ href: null }} />
        <Tabs.Screen name="sticker-studio" options={{ href: null }} />
        <Tabs.Screen name="explore-trim" options={{ href: null }} />
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

function AppGate() {
  const router = useRouter();

  useEffect(() => {
    void recordDailyOpen();
    void getOrCreateStatsSessionId();
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted) {
        AsyncStorage.getItem('@dumpit_onboard').then(onboard => {
          if (mounted) safeReplace(onboard ? '/hub' : '/onboarding');
        });
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [router]);

  return <TabsLayout />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DeepLinkHandler />
        <AppGate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
