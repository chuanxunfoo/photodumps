/**
 * Notification preferences — master switch + category toggles (persisted + scheduled locally).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import type { NotificationContentInput, NotificationTriggerInput } from 'expo-notifications/build/Notifications.types';
import {
  Bell, Calendar, Flame, Moon, Sparkles, Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { getLocaleUi } from '../_lib/localeUi';
import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
} from '../_lib/notificationsNative';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { useTheme } from './ThemeContext';

const PREFS_KEY = '@dumpit_notification_prefs_v1';
const ANDROID_CHANNEL = 'swipeclean-default';

export type NotifPrefs = {
  master: boolean;
  reminders: boolean;
  digest: boolean;
  streak: boolean;
  supercut: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  master: false,
  reminders: true,
  digest: true,
  streak: true,
  supercut: false,
};

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'photodumps',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF0055',
  });
}

async function loadPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

async function savePrefs(p: NotifPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

async function cancelAllScheduled() {
  await cancelAllScheduledNotificationsAsync();
}

async function applySchedules(p: NotifPrefs) {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannel();
  await cancelAllScheduled();
  if (!p.master) return;
  const perm = await getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const req = await requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;

  const androidChannelId = Platform.OS === 'android' ? ANDROID_CHANNEL : undefined;
  const Tr = SchedulableTriggerInputTypes;

  const baseContent = (title: string, body: string, data: Record<string, string>) => ({
    title,
    body,
    data,
    ...(Platform.OS === 'android' && androidChannelId
      ? { android: { channelId: androidChannelId } }
      : {}),
  });

  const schedule = async (identifier: string, content: NotificationContentInput, trigger: NotificationTriggerInput) => {
    try {
      await scheduleNotificationAsync({ identifier, content, trigger });
    } catch (e) {
      console.warn(`[notifications] schedule ${identifier}`, e);
    }
  };

  if (p.reminders) {
    await schedule(
      'sw-reminders',
      baseContent('photodumps', 'Quick nudge: a 2-minute swipe clears mental clutter.', { type: 'reminder' }),
      {
        type: Tr.DAILY,
        hour: 18,
        minute: 30,
        ...(androidChannelId ? { channelId: androidChannelId } : {}),
      },
    );
  }
  if (p.digest) {
    await schedule(
      'sw-digest',
      baseContent('Weekly digest', 'See how much calmer your camera roll feels this week.', { type: 'digest' }),
      {
        type: Tr.WEEKLY,
        weekday: 1,
        hour: 10,
        minute: 0,
        ...(androidChannelId ? { channelId: androidChannelId } : {}),
      },
    );
  }
  if (p.streak) {
    await schedule(
      'sw-streak',
      baseContent(
        'Streak watch',
        'You are close to breaking a cleanup streak — open photodumps for one pass.',
        { type: 'streak' },
      ),
      {
        type: Tr.DAILY,
        hour: 21,
        minute: 15,
        ...(androidChannelId ? { channelId: androidChannelId } : {}),
      },
    );
  }
  if (p.supercut) {
    await schedule(
      'sw-supercut',
      baseContent(
        'Supercut',
        'Run an AI batch scan when you have a quiet moment — one tap from Explore.',
        { type: 'supercut' },
      ),
      {
        type: Tr.WEEKLY,
        weekday: 7,
        hour: 11,
        minute: 0,
        ...(androidChannelId ? { channelId: androidChannelId } : {}),
      },
    );
  }
}

function ToggleCard({
  icon,
  title,
  hint,
  value,
  disabled,
  onValue,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onValue: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <LinearGradient
      colors={[theme.bg2, theme.isDark ? '#14141c' : '#f3f4f6']}
      style={[tc.card, { borderColor: theme.border }]}
    >
      <View style={tc.cardRow}>
        <View style={[tc.iconWrap, { backgroundColor: theme.accentSoft }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[tc.title, { color: theme.text }]}>{title}</Text>
          <Text style={[tc.hint, { color: theme.textSub }]}>{hint}</Text>
        </View>
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={onValue}
          trackColor={{ false: theme.border, true: theme.accent }}
          thumbColor="#fff"
        />
      </View>
    </LinearGradient>
  );
}

const tc = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 17 },
});

export default function NotificationsScreen() {
  const goBack = useExploreAwareBack();
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(async () => {
    const p = await loadPrefs();
    setPrefs(p);
    setReady(true);
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  const update = async (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePrefs(next);
    try {
      await applySchedules(next);
    } catch (e) {
      console.warn(e);
      if (Platform.OS !== 'web') {
        Alert.alert('Notifications', 'Could not update system schedules. Check OS notification settings.');
      }
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <AppHeader variant="detail" onBack={goBack} subtitle={u.notificationsSubtitle} />
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Notifications are not available on web.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, theme.isDark ? '#0f172a' : '#e0e7ff']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="detail" onBack={goBack} subtitle={u.notificationsSubtitle} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#4F46E5', '#7C3AED', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Bell size={32} color="#FFF" />
            <Text style={styles.heroTitle}>{u.notificationsTitle}</Text>
            <Text style={styles.heroLead}>{u.notificationsSubtitle}</Text>
          </LinearGradient>

          {!ready ? null : (
            <>
              <ToggleCard
                theme={theme}
                icon={<Moon size={22} color={theme.accent} />}
                title={u.notificationsMaster}
                hint={u.notificationsMasterHint}
                value={prefs.master}
                onValue={(v) => void update({ master: v })}
              />
              <ToggleCard
                theme={theme}
                icon={<Sparkles size={22} color="#38BDF8" />}
                title={u.notificationsReminders}
                hint={u.notificationsRemindersHint}
                value={prefs.reminders}
                disabled={!prefs.master}
                onValue={(v) => void update({ reminders: v })}
              />
              <ToggleCard
                theme={theme}
                icon={<Calendar size={22} color="#FBBF24" />}
                title={u.notificationsDigest}
                hint={u.notificationsDigestHint}
                value={prefs.digest}
                disabled={!prefs.master}
                onValue={(v) => void update({ digest: v })}
              />
              <ToggleCard
                theme={theme}
                icon={<Flame size={22} color="#F97316" />}
                title={u.notificationsStreak}
                hint={u.notificationsStreakHint}
                value={prefs.streak}
                disabled={!prefs.master}
                onValue={(v) => void update({ streak: v })}
              />
              <ToggleCard
                theme={theme}
                icon={<Zap size={22} color="#A78BFA" />}
                title={u.notificationsSupercut}
                hint={u.notificationsSupercutHint}
                value={prefs.supercut}
                disabled={!prefs.master}
                onValue={(v) => void update({ supercut: v })}
              />

              <TouchableOpacity
                style={[styles.reset, { borderColor: theme.border }]}
                onPress={() => void update({ master: false })}
              >
                <Text style={[styles.resetTxt, { color: theme.textSub }]}>Silence all & clear schedules</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 48 },
  hero: {
    borderRadius: 26,
    padding: 22,
    marginBottom: 22,
    gap: 8,
  },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  heroLead: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  reset: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetTxt: { fontSize: 13, fontWeight: '800' },
});
