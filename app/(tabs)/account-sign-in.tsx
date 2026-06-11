import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatAuthError, signInWithAppleAccount } from '../_lib/accountAuth';
import { getLocaleUi } from '../_lib/localeUi';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from './ThemeContext';

/** Full-screen native Apple Sign In — avoids Modal + TurboModule crash. */
export default function AccountSignInScreen() {
  const { theme, setUser, language } = useTheme();
  const u = getLocaleUi(language);
  const [busy, setBusy] = useState(false);

  const handleApple = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const profile = await signInWithAppleAccount(setUser);
      if (!profile) return;
      Alert.alert(
        u.accountSignedInTitle,
        u.accountSignedInMsg.replace('{email}', profile.email || 'your Apple ID'),
      );
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/hub', params: { page: 'generals' } });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(u.accountSignInFailed, formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <AppHeader
          variant="detail"
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/hub', params: { page: 'generals' } });
          }}
          subtitle={u.accountSignInTitle}
        />
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]}>{u.accountSignInTitle}</Text>
          <Text style={[styles.sub, { color: theme.textSub }]}>{u.accountSignInSub}</Text>
          {busy ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
          ) : Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={styles.appleBtn}
              onPress={() => { void handleApple(); }}
            />
          ) : (
            <Text style={{ color: theme.textMuted }}>Apple Sign In is iOS only.</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 },
  sub: { fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 28 },
  appleBtn: { width: '100%', height: 52 },
});
