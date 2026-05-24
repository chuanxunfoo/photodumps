import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_LOGO = require('./assets/brand/photodumps-logo.png');
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { safeReplace } from './_lib/safeNavigate';
import { getSessionSafe } from './(tabs)/supabase';
import { ThemeProvider, useTheme } from './(tabs)/ThemeContext';

const { width } = Dimensions.get('window');

function SplashScreen({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(fadeOut, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] });

  return (
    <Animated.View style={[styles.splash, { opacity: fadeOut }]}>
      <Animated.View style={{ transform: [{ scale }, { rotate: spin }], opacity }}>
        <View style={styles.logoWrap}>
          <Image source={SPLASH_LOGO} style={styles.splashLogo} contentFit="cover" />
          <Text style={styles.logoText}>photodumps</Text>
          <Text style={styles.logoSub}>dump what's perfect. keep what's real.</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function InnerLayout() {
  const { theme, setUser } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashDone = async () => {
    setSplashDone(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/$/, '');
      if (path === '/promo' || path.endsWith('/promo')) return;
    }
    const session = await getSessionSafe();

    if (!session) {
      await setUser(null);
      safeReplace('/landing');
      return;
    }

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
    safeReplace('/hub');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="promo" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030303',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoWrap: { alignItems: 'center' },
  splashLogo: { width: 110, height: 110, borderRadius: 28, marginBottom: 20 },
  logoText: { color: '#3B5BFC', fontSize: 36, fontWeight: '900', letterSpacing: -2 },
  logoSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', letterSpacing: 2, marginTop: 6 },
});