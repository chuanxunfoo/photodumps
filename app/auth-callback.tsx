import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isOAuthSession } from './_lib/authSession';
import { safeReplace } from './_lib/safeNavigate';
import { createSessionFromUrl, parseOAuthRedirectParams } from './(tabs)/authOAuth';
import { supabase } from './(tabs)/supabase';
import type { UserProfile } from './(tabs)/ThemeContext';
import { useTheme } from './(tabs)/ThemeContext';

async function profileFromSession(session: NonNullable<Awaited<ReturnType<typeof createSessionFromUrl>>>): Promise<UserProfile> {
  const u = session.user;
  const meta = u.user_metadata as { username?: string } | undefined;
  return {
    uid: u.id,
    email: u.email ?? '',
    username: (typeof meta?.username === 'string' && meta.username) || u.email?.split('@')[0] || 'user',
    isLoggedIn: true,
  };
}

export default function AuthCallbackScreen() {
  const { setUser } = useTheme();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url || !url.includes('auth-callback')) {
          safeReplace('/auth');
          return;
        }

        const params = parseOAuthRedirectParams(url);
        if (params.error) {
          safeReplace('/auth?error=1');
          return;
        }

        if (params.type === 'recovery') {
          setMessage('Opening password reset…');
          const session = await createSessionFromUrl(url);
          if (session && !cancelled) {
            await setUser(await profileFromSession(session));
            router.replace('/reset-password');
          } else {
            safeReplace('/auth?error=1');
          }
          return;
        }

        const session = await createSessionFromUrl(url);
        if (!session) {
          safeReplace('/auth?error=1');
          return;
        }

        if (isOAuthSession(session)) {
          if (!cancelled) setMessage('Welcome back');
          await setUser(await profileFromSession(session));
          const onboard = await AsyncStorage.getItem('@dumpit_onboard');
          safeReplace(onboard ? '/hub' : '/onboarding');
          return;
        }

        if (!cancelled) setMessage('Email verified');
        await supabase.auth.signOut();
        safeReplace('/auth?verified=1');
      } catch {
        safeReplace('/auth?error=1');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color="#3B5BFC" size="large" />
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  msg: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(18,20,26,0.55)',
  },
});
