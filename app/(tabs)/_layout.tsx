import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './ThemeContext';
import { createSessionFromUrl } from './authOAuth';
import { supabase } from './supabase';
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
      router.replace(onboard ? '/calendar' : '/onboarding');
    } catch (e) {
      console.warn('Deep link auth error:', e);
    }
  };

  return null;
}

function FlameTrashIcon({ focused }: { focused: boolean }) {
  const { theme } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (focused) {
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])).start();
    } else { glow.stopAnimation(); glow.setValue(0); }
    return () => glow.stopAnimation();
  }, [focused]);

  const dim = theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)';
  return (
    <Animated.View style={{
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: focused ? '#FF0055' : 'transparent',
      borderWidth: focused ? 0 : 1.5, borderColor: dim,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#FF0055', shadowRadius: focused ? 14 : 0,
      shadowOpacity: focused ? 0.8 : 0, elevation: focused ? 10 : 0,
    }}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>🔥</Text>
    </Animated.View>
  );
}

function TabIcon({ focused, icon, label, activeColor }: any) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const dotOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.1 : 1, useNativeDriver: true, friction: 7 }),
      Animated.timing(dotOp, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [focused]);
  const idle = theme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)';
  return (
    <Animated.View style={[s.iconWrap, { transform: [{ scale }] }]}>
      <Animated.View style={[s.dot, { backgroundColor: activeColor, opacity: dotOp }]} />
      {icon(focused ? activeColor : idle)}
      <Text style={[s.label, { color: focused ? activeColor : idle }]}>{label}</Text>
    </Animated.View>
  );
}

const HIDE_TAB_BAR = new Set(['landing', 'onboarding', 'auth']);

function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme, t } = useTheme();
  const pathname = usePathname() ?? '';
  const hideTabBar = [...HIDE_TAB_BAR].some((r) => pathname.includes(r));

  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarShowLabel: false,
      tabBarStyle: hideTabBar
        ? { display: 'none' }
        : {
            backgroundColor: theme.tabBar,
            borderTopWidth: 1, borderTopColor: theme.border,
            height: 64 + insets.bottom, paddingBottom: insets.bottom,
          },
    }}>
      <Tabs.Screen name="calendar" options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused}
            icon={(c: string) => (
              <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 18, height: 18, gap: 2 }}>
                  {[0,1,2,3].map(i => <View key={i} style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: c }} />)}
                </View>
              </View>
            )}
            label={t.tabArchive} activeColor={theme.accent}
          />
        ),
      }} />
      <Tabs.Screen name="dump" options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused}
            icon={(_c: string) => <FlameTrashIcon focused={focused} />}
            label={t.tabDump} activeColor="#FF0055"
          />
        ),
      }} />
      <Tabs.Screen name="explore" options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused}
            icon={(c: string) => (
              <View style={{ width: 22, height: 22, justifyContent: 'center', gap: 3 }}>
                <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: c }} />
                <View style={{ width: 13, height: 2, borderRadius: 1, backgroundColor: c }} />
                <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: c }} />
              </View>
            )}
            label={t.tabExplore} activeColor="#BF5AF2"
          />
        ),
      }} />
      <Tabs.Screen name="insights"   options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="auth"       options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="landing"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="subscribe"  options={{ href: null }} />
      <Tabs.Screen name="payment"    options={{ href: null }} />
      <Tabs.Screen name="duplicates"  options={{ href: null }} />
      <Tabs.Screen name="settings"    options={{ href: null }} />
      <Tabs.Screen name="deep-clean"  options={{ href: null }} />
      <Tabs.Screen name="spin-wheel"  options={{ href: null }} />
      <Tabs.Screen name="photobooth"  options={{ href: null }} />
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
  );
}

function AppGate() {
  const router = useRouter();

  useEffect(() => {
    void recordDailyOpen();
    void getOrCreateStatsSessionId();
  }, []);

  // Do not navigate here on cold start: `app/_layout.tsx` already routes after splash.
  // A duplicate gate raced `getSessionSafe()` (often null at 80ms) → `/auth` vs `/(tabs)/calendar` → unmatched routes.

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted) {
        AsyncStorage.getItem('@dumpit_onboard').then(onboard => {
          if (mounted) router.replace(onboard ? '/calendar' : '/onboarding');
        });
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [router]);

  return (
    <>
      <TabsLayout />
    </>
  );
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

const s = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 3, paddingHorizontal: 20, paddingTop: 6 },
  dot:      { position: 'absolute', top: -2, width: 4, height: 4, borderRadius: 2 },
  label:    { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.5 },
});
