import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { UserProfile } from '../(tabs)/ThemeContext';
import { deleteUserAccount } from './accountDeletion';
import { signOutAccount } from './accountAuth';

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

export async function runAccountDeleteFlow(params: {
  setUser: (u: UserProfile | null) => void | Promise<void>;
  labels: {
    settingsDeleteConfirmTitle: string;
    settingsDeleteConfirmMsg: string;
    settingsDeleteAccount: string;
    settingsDeleteSuccess: string;
    captionCancel: string;
  };
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
