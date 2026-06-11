import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatAuthError, signInWithAppleAccount } from '../_lib/accountAuth';
import { isNativeAppleSignInAvailable } from '../_lib/appleAuthNative';
import { getLocaleUi } from '../_lib/localeUi';
import { waitUntilNativeIdle } from '../_lib/launchStability';
import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { useTheme } from './ThemeContext';

type AppleButtonComponent = React.ComponentType<{
  buttonType: number;
  buttonStyle: number;
  cornerRadius: number;
  style: object;
  onPress: () => void;
}>;

export default function AccountSignInScreen() {
  const goBack = useExploreAwareBack('generals');
  const { theme, setUser, language } = useTheme();
  const u = getLocaleUi(language);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [AppleButton, setAppleButton] = useState<AppleButtonComponent | null>(null);
  const [appleTypes, setAppleTypes] = useState<{
    SIGN_IN: number;
    BLACK: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await waitUntilNativeIdle();
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      if (cancelled) return;
      const available = await isNativeAppleSignInAvailable();
      if (cancelled) return;
      setAppleAvailable(available);
      if (Platform.OS === 'ios' && available) {
        const AppleAuthentication = await import('expo-apple-authentication');
        if (cancelled) return;
        setAppleButton(() => AppleAuthentication.AppleAuthenticationButton as unknown as AppleButtonComponent);
        setAppleTypes({
          SIGN_IN: AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
          BLACK: AppleAuthentication.AppleAuthenticationButtonStyle.BLACK,
        });
      }
      setReady(true);
    };
    void boot();
    return () => { cancelled = true; };
  }, []);

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
      goBack();
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
        <AppHeader variant="detail" onBack={goBack} subtitle={u.accountSignInTitle} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]}>{u.accountSignInTitle}</Text>
          <Text style={[styles.sub, { color: theme.textSub }]}>{u.accountSignInSub}</Text>

          {!ready || busy ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 28 }} />
          ) : !appleAvailable ? (
            <Text style={{ color: theme.textMuted, marginTop: 20 }}>
              Sign in with Apple is not available on this device.
            </Text>
          ) : AppleButton && appleTypes ? (
            <AppleButton
              buttonType={appleTypes.SIGN_IN}
              buttonStyle={appleTypes.BLACK}
              cornerRadius={16}
              style={styles.appleBtn}
              onPress={() => { void handleApple(); }}
            />
          ) : (
            <TouchableOpacity style={styles.fallbackBtn} onPress={() => { void handleApple(); }}>
              <Text style={styles.fallbackBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
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
  fallbackBtn: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  fallbackBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
