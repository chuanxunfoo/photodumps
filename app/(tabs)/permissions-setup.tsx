import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Images } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { markPermissionsSetupComplete } from '../_lib/appLaunchFlow';
import { getLocaleUi } from '../_lib/localeUi';
import { requestPermissionsAsync } from '../_lib/notificationsNative';
import { useTheme } from './ThemeContext';

export default function PermissionsSetupScreen() {
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const [busy, setBusy] = useState(false);
  const [photosDone, setPhotosDone] = useState(false);
  const [notifDone, setNotifDone] = useState(false);

  const requestPhotos = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setPhotosDone(status === 'granted' || status === 'limited');
    return status;
  };

  const requestNotifications = async () => {
    const { status } = await requestPermissionsAsync();
    setNotifDone(status === 'granted');
    return status;
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!photosDone) await requestPhotos();
      if (!notifDone) await requestNotifications();
      await markPermissionsSetupComplete();
      router.replace('/hub?page=calendar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, theme.bg2]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[s.eyebrow, { color: theme.textMuted }]}>{u.permissionsSetupEyebrow}</Text>
          <Text style={[s.title, { color: theme.text }]}>{u.permissionsSetupTitle}</Text>
          <Text style={[s.lead, { color: theme.textSub }]}>{u.permissionsSetupLead}</Text>

          <View style={[s.card, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <View style={s.cardRow}>
              <View style={[s.iconWrap, { backgroundColor: theme.accentSoft }]}>
                <Images size={22} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{u.permissionsPhotosTitle}</Text>
                <Text style={[s.cardSub, { color: theme.textSub }]}>{u.permissionsPhotosSub}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => void requestPhotos()}
              activeOpacity={0.88}
            >
              <Text style={[s.secondaryBtnText, { color: theme.text }]}>
                {photosDone ? u.permissionsAllowed : u.permissionsAllowPhotos}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[s.card, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <View style={s.cardRow}>
              <View style={[s.iconWrap, { backgroundColor: theme.accentSoft }]}>
                <Bell size={22} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{u.permissionsNotifTitle}</Text>
                <Text style={[s.cardSub, { color: theme.textSub }]}>{u.permissionsNotifSub}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => void requestNotifications()}
              activeOpacity={0.88}
            >
              <Text style={[s.secondaryBtnText, { color: theme.text }]}>
                {notifDone ? u.permissionsAllowed : u.permissionsAllowNotif}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: theme.accent, opacity: busy ? 0.75 : 1 }]}
          onPress={() => void finish()}
          disabled={busy}
          activeOpacity={0.88}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.primaryBtnText}>{u.permissionsContinue}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 10 },
  lead: { fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 22 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  cardRow: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'flex-start' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  cardSub: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800' },
  primaryBtn: {
    marginHorizontal: 22,
    marginBottom: 12,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
});
