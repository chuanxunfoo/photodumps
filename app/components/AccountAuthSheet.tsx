import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatAuthError,
  signInWithAppleAccount,
  signOutAccount,
} from '../_lib/accountAuth';
import { deleteUserAccount } from '../_lib/accountDeletion';
import { getLocaleUi } from '../_lib/localeUi';
import { useTheme } from '../(tabs)/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function openAccountActionsSheet(params: {
  onSignOut: () => void;
  onDelete: () => void;
  labels: { signOut: string; deleteAccount: string; cancel: string };
}) {
  const { onSignOut, onDelete, labels } = params;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [labels.signOut, labels.deleteAccount, labels.cancel],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) onSignOut();
        if (index === 1) onDelete();
      },
    );
    return;
  }

  Alert.alert('Account', undefined, [
    { text: labels.signOut, onPress: onSignOut },
    { text: labels.deleteAccount, style: 'destructive', onPress: onDelete },
    { text: labels.cancel, style: 'cancel' },
  ]);
}

export function AccountAuthSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, setUser, language } = useTheme();
  const u = getLocaleUi(language);
  const [busy, setBusy] = useState(false);

  const handleAppleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const profile = await signInWithAppleAccount(setUser);
      if (!profile) return;
      onClose();
      Alert.alert(
        u.accountSignedInTitle,
        u.accountSignedInMsg.replace('{email}', profile.email || 'your Apple ID'),
      );
    } catch (e) {
      Alert.alert(u.accountSignInFailed, formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </Pressable>
      <View style={[styles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={busy}>
            <Text style={{ color: theme.textMuted, fontSize: 22 }}>×</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>{u.accountSignInTitle}</Text>
          <Text style={[styles.sub, { color: theme.textSub }]}>{u.accountSignInSub}</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => void handleAppleSignIn()}
            disabled={busy}
            style={[styles.appleBtn, { opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#FFF" />
                <Text style={styles.appleBtnText}>{u.accountContinueApple}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export async function runAccountDeleteFlow(params: {
  setUser: (u: import('../(tabs)/ThemeContext').UserProfile | null) => void | Promise<void>;
  labels: Pick<LocaleUiLabels, 'settingsDeleteConfirmTitle' | 'settingsDeleteConfirmMsg' | 'settingsDeleteAccount' | 'settingsDeleteSuccess' | 'captionCancel'>;
}): Promise<void> {
  const { setUser, labels } = params;
  Alert.alert(labels.settingsDeleteConfirmTitle, labels.settingsDeleteConfirmMsg, [
    { text: labels.captionCancel, style: 'cancel' },
    {
      text: labels.settingsDeleteAccount,
      style: 'destructive',
      onPress: () => {
        Alert.alert(labels.settingsDeleteConfirmTitle, 'This permanently deletes your account. Continue?', [
          { text: labels.captionCancel, style: 'cancel' },
          {
            text: labels.settingsDeleteAccount,
            style: 'destructive',
            onPress: () => void (async () => {
              const res = await deleteUserAccount();
              if (!res.ok) {
                Alert.alert(labels.settingsDeleteAccount, res.error);
                return;
              }
              await signOutAccount(setUser);
              Alert.alert(labels.settingsDeleteAccount, labels.settingsDeleteSuccess);
            })(),
          },
        ]);
      },
    },
  ]);
}

type LocaleUiLabels = ReturnType<typeof getLocaleUi>;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
    minHeight: 280,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 28,
  },
  appleBtn: {
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
