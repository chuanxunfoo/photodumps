import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from './components/AppErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { DeepLinkHandler } from './_lib/deepLinkHandler';
import { safeReplace } from './_lib/safeNavigate';
import { SplashReplayContext } from './_lib/splashReplay';
import { resolveLaunchRoute } from './_lib/appLaunchFlow';
import { StripeRoot } from './_lib/stripe/StripeRoot';
import { getSessionSafe } from './(tabs)/supabase';
import { ThemeProvider, useTheme } from './(tabs)/ThemeContext';

type InnerLayoutProps = { onLaunchReady?: () => void };

function InnerLayout({ onLaunchReady }: InnerLayoutProps) {
  const { theme, setUser } = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashKey, setSplashKey] = useState(0);
  const isReplayRef = useRef(false);
  const afterReplayRef = useRef<(() => void) | undefined>();
  const launchReadyRef = useRef(false);

  const replaySplash = useCallback((onFinished?: () => void) => {
    isReplayRef.current = true;
    afterReplayRef.current = onFinished;
    setSplashKey((k) => k + 1);
    setSplashVisible(true);
  }, []);

  const handleSplashDone = async () => {
    if (isReplayRef.current) {
      isReplayRef.current = false;
      setSplashVisible(false);
      afterReplayRef.current?.();
      afterReplayRef.current = undefined;
      onLaunchReady?.();
      return;
    }

    setSplashVisible(false);

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/\/$/, '');
        if (path === '/promo' || path.endsWith('/promo')) return;
      }
      const session = await getSessionSafe();

      if (session) {
        const u = session.user;
        const meta = u.user_metadata as { username?: string } | undefined;
        const username =
          (typeof meta?.username === 'string' && meta.username) ||
          u.email?.split('@')[0] ||
          'user';
        await setUser({
          uid: u.id,
          email: u.email ?? '',
          username,
          isLoggedIn: true,
        });
        await AsyncStorage.setItem('@dumpit_signed_once', '1');
      } else {
        await setUser(null);
      }

      safeReplace(await resolveLaunchRoute());
    } catch (e) {
      console.warn('[launch] splash routing failed', e);
      safeReplace('/hub?page=calendar');
    } finally {
      onLaunchReady?.();
    }
  };

  return (
    <SplashReplayContext.Provider value={{ replaySplash }}>
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <StatusBar style={splashVisible ? 'dark' : theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth-callback" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="gmail-callback" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="verify" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="promo" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>

        {splashVisible && <SplashScreen key={splashKey} onDone={handleSplashDone} />}
      </View>
    </SplashReplayContext.Provider>
  );
}

export default function RootLayout() {
  const [deepLinksReady, setDeepLinksReady] = useState(false);

  return (
    <SafeAreaProvider>
      <StripeRoot>
        <ThemeProvider>
          <AppErrorBoundary>
            <InnerLayout onLaunchReady={() => setDeepLinksReady(true)} />
            {deepLinksReady && <DeepLinkHandler />}
          </AppErrorBoundary>
        </ThemeProvider>
      </StripeRoot>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
