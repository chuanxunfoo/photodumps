import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatAuthError } from '../_lib/accountAuth';
import { getLocaleUi } from '../_lib/localeUi';
import { markAuthFlowStart } from '../_lib/launchStability';
import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { useTheme } from './ThemeContext';

/**
 * Pure React UI — zero expo-apple-authentication imports until the user taps the button.
 */
export default function AccountSignInScreen() {
  const goBack = useExploreAwareBack('generals');
  const { theme, setUser, language } = useTheme();
  const u = getLocaleUi(language);
  const [busy, setBusy] = useState(false);

  const handleApple = async () => {
    if (busy || Platform.OS !== 'ios') return;
    setBusy(true);
    markAuthFlowStart();
    try {
      const { signInWithAppleAccount } = await import('../_lib/accountAuth');
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

          <TouchableOpacity
            style={[styles.appleBtn, { opacity: busy ? 0.7 : 1 }]}
            onPress={() => { void handleApple(); }}
            disabled={busy}
            activeOpacity={0.88}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.appleBtnText}>{u.accountContinueApple}</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Uses your Apple ID securely. We never see your password.
          </Text>
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
  sub: { fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 32 },
  appleBtn: {
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  appleBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: 'center' },
});
