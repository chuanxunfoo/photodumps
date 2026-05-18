import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Crown, Mail, Shield, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { getLocaleUi } from '../_lib/localeUi';
import { useExploreAwareBack } from '../_lib/exploreBack';
import {
  adminSetPlanByEmail,
  type ProfilePlanType,
} from '../_lib/profilePlanSupabase';
import { useTheme } from './ThemeContext';

function InfoRow({
  label,
  value,
  labelColor,
  valueColor,
  borderColor,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
  borderColor: string;
}) {
  return (
    <View style={[s.row, { borderTopColor: borderColor }]}>
      <Text style={[s.rowLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const ADMIN_PLANS: ProfilePlanType[] = ['hobby', 'pro', 'admin'];

export default function SettingsScreen() {
  const goBack = useExploreAwareBack();
  const { theme, user, isPro, isAdmin, swipesLeft, openSubscription, setUser, language } = useTheme();
  const u = getLocaleUi(language);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPlan, setAdminPlan] = useState<ProfilePlanType>('hobby');
  const [adminBusy, setAdminBusy] = useState(false);

  const plan = isAdmin ? u.settingsPlanAdmin : isPro ? u.settingsPlanPro : u.settingsPlanHobby;
  const planHint = isPro || isAdmin ? u.settingsUnlimited : `${swipesLeft} ${u.settingsSwipesHint}`;

  const borderHair = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const labelMuted = theme.textMuted;
  const valueMain = theme.text;

  const saveAdminPlan = async () => {
    const email = adminEmail.trim();
    if (!email) {
      Alert.alert('Admin', 'Enter a user email.');
      return;
    }
    setAdminBusy(true);
    const res = await adminSetPlanByEmail(email, adminPlan);
    setAdminBusy(false);
    if (!res.ok) {
      Alert.alert('Could not update plan', res.error ?? 'Unknown error');
      return;
    }
    Alert.alert('Plan updated', `${email} is now ${adminPlan}.`);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, theme.bg2]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="detail" onBack={goBack} subtitle={`${u.settingsTitle} · ${u.settingsSubtitle}`} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[s.card, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <View style={s.cardTop}>
            <View style={[s.avatar, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
              <User size={18} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>
                {user?.username || 'User'}
              </Text>
              <Text style={[s.sub, { color: theme.textSub }]} numberOfLines={1}>
                {user?.email || 'Not signed in'}
              </Text>
            </View>
            <View style={[s.planPill, { borderColor: theme.border, backgroundColor: theme.bg3 ?? theme.bg2 }]}>
              {isPro || isAdmin ? <Crown size={14} color="#FFD600" /> : <Shield size={14} color={theme.textSub} />}
              <Text style={[s.planText, { color: theme.text }]}>{plan}</Text>
            </View>
          </View>
          <Text style={[s.planHint, { color: theme.textMuted }]}>{planHint}</Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <View style={s.sectionTitleRow}>
            <Mail size={14} color={theme.textSub} />
            <Text style={[s.sectionTitle, { color: theme.textSub }]}>{u.settingsAccount}</Text>
          </View>
          <InfoRow label={u.settingsUserId} value={user?.uid || '—'} labelColor={labelMuted} valueColor={valueMain} borderColor={borderHair} />
          <InfoRow label={u.settingsEmail} value={user?.email || '—'} labelColor={labelMuted} valueColor={valueMain} borderColor={borderHair} />
          <InfoRow label={u.settingsUsername} value={user?.username || '—'} labelColor={labelMuted} valueColor={valueMain} borderColor={borderHair} />
        </View>

        {!isPro && !isAdmin && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={openSubscription}
            activeOpacity={0.88}
          >
            <Text style={s.primaryBtnText}>{u.settingsUpgrade}</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <View style={[s.card, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Text style={[s.sectionTitle, { color: theme.textSub, marginBottom: 10 }]}>ADMIN · USER PLANS</Text>
            <Text style={[s.adminHint, { color: theme.textMuted }]}>
              Set plan in Supabase profiles. User must have signed in at least once.
            </Text>
            <TextInput
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="user@email.com"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[s.adminInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg3 ?? theme.bg }]}
            />
            <View style={s.planRow}>
              {ADMIN_PLANS.map((p) => {
                const active = adminPlan === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setAdminPlan(p)}
                    style={[
                      s.planChip,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accentSoft : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[s.planChipText, { color: active ? theme.accent : theme.textSub }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 12, marginHorizontal: 0, backgroundColor: theme.accent, opacity: adminBusy ? 0.7 : 1 }]}
              onPress={() => void saveAdminPlan()}
              disabled={adminBusy}
              activeOpacity={0.88}
            >
              {adminBusy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.primaryBtnText}>Save plan</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[s.secondaryBtn, { borderColor: theme.border }]}
          onPress={async () => {
            await AsyncStorage.removeItem('@dumpit_onboard');
            await setUser(null);
            router.replace('/landing');
          }}
          activeOpacity={0.88}
        >
          <Text style={[s.secondaryBtnText, { color: theme.textSub }]}>{u.settingsSignOut}</Text>
        </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  planText: { fontSize: 12, fontWeight: '800' },
  planHint: { marginTop: 10, fontSize: 11, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  rowValue: { maxWidth: '60%', fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '800' },
  adminHint: { fontSize: 11, fontWeight: '600', lineHeight: 16, marginBottom: 10 },
  adminInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  planRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  planChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  planChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
});
