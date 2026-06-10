import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isEmailVerificationCallback, isFederatedAuthSession } from './_lib/authSession';
import { safeReplace } from './_lib/safeNavigate';
import { createSessionFromUrl, finalizeOAuthSession, isOAuthBrowserSessionActive, parseOAuthRedirectParams } from './(tabs)/authOAuth';
import { supabase } from './(tabs)/supabase';
import type { UserProfile } from './(tabs)/ThemeContext';
import { useTheme } from './(tabs)/ThemeContext';

async function profileFromSession(session: NonNullable<Awaited<ReturnType<typeof createSessionFromUrl>>>): Promise<UserProfile> {
  const u = session.user;
  const meta = u.user_metadata as { username?: string; full_name?: string } | undefined;
  return {
    uid: u.id,
    email: u.email ?? '',
    username:
      (typeof meta?.username === 'string' && meta.username) ||
      (typeof meta?.full_name === 'string' && meta.full_name.split(' ')[0]) ||
      u.email?.split('@')[0] ||
      'user',
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
          safeReplace('/hub?page=generals');
          return;
        }

        if (await isOAuthBrowserSessionActive()) {
          safeReplace('/hub?page=generals');
          return;
        }

        const params = parseOAuthRedirectParams(url);
        if (params.error) {
          safeReplace('/hub?page=generals');
          return;
        }

        if (params.type === 'recovery') {
          setMessage('Opening password reset…');
          const session = await createSessionFromUrl(url);
          if (session && !cancelled) {
            await setUser(await profileFromSession(session));
            router.replace('/reset-password');
          } else {
            safeReplace('/hub?page=generals');
          }
          return;
        }

        const session = await createSessionFromUrl(url);
        if (!session) {
          safeReplace('/hub?page=generals');
          return;
        }

        if (isFederatedAuthSession(session) || !isEmailVerificationCallback(params)) {
          if (!cancelled) setMessage('Welcome back');
          await finalizeOAuthSession(session);
          await setUser(await profileFromSession(session));
          await AsyncStorage.setItem('@dumpit_signed_once', '1');
          safeReplace('/hub?page=generals');
          return;
        }

        if (!cancelled) setMessage('Email verified');
        await supabase.auth.signOut();
        safeReplace('/hub?page=generals');
      } catch {
        safeReplace('/hub?page=generals');
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
