import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
  formatSignedInMessage,
  signInWithAppleAccount,
  signOutAccount,
} from '../_lib/accountAuth';
import { deleteUserAccount } from '../_lib/accountDeletion';
import { getLocaleUi } from '../_lib/localeUi';
import { useTheme } from '../(tabs)/ThemeContext';

const SHEET_H = Math.min(340, Dimensions.get('window').height * 0.42);

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
  const [mounted, setMounted] = useState(false);
  const slideY = useRef(new Animated.Value(SHEET_H + insets.bottom)).current;
  const authPendingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideY.setValue(SHEET_H + insets.bottom);
      Animated.spring(slideY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(slideY, {
      toValue: SHEET_H + insets.bottom,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !authPendingRef.current) setMounted(false);
    });
  }, [visible, mounted, slideY, insets.bottom]);

  const handleAppleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    authPendingRef.current = true;
    try {
      const profile = await signInWithAppleAccount(setUser);
      if (!profile) return;
      onClose();
      Alert.alert(
        u.accountSignedInTitle,
        formatSignedInMessage(profile.email, {
          withEmail: u.accountSignedInMsg,
          withAppleId: u.accountSignedInAppleMsg,
        }),
      );
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(u.accountSignInFailed, formatAuthError(e));
    } finally {
      authPendingRef.current = false;
      setBusy(false);
    }
  };

  if (!mounted && !visible) return null;

  return (
    <Modal visible={mounted || visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.root}>
        <Pressable style={st.backdrop} onPress={busy ? undefined : onClose} />
        <Animated.View
          style={[
            st.sheet,
            {
              backgroundColor: theme.bg,
              paddingBottom: Math.max(insets.bottom, 8),
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={[st.handle, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={st.closeBtn} onPress={onClose} disabled={busy}>
            <Text style={{ color: theme.textMuted, fontSize: 22 }}>×</Text>
          </TouchableOpacity>

          <Text style={[st.title, { color: theme.text }]}>{u.accountSignInTitle}</Text>
          <Text style={[st.sub, { color: theme.textSub }]}>{u.accountSignInSub}</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => void handleAppleSignIn()}
            disabled={busy}
            style={[st.appleBtn, { opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#FFF" />
                <Text style={st.appleBtnText}>{u.accountContinueApple}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
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

const st = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    minHeight: SHEET_H,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 24,
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
