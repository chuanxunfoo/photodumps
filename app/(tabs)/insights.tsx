import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  Mail,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { getLocaleUi } from '../_lib/localeUi';
import { resetStatsSession, getOrCreateStatsSessionId, getStatsSessionId } from '../_lib/statsSession';
import { fetchEmailDetoxStats, type EmailDetoxStats } from '../_lib/emailDetoxStats';
import {
  estimateAssetBytes,
  fetchUserStatsTotals,
  fetchUserStatsAggregate,
  resolveAuthUserId,
  type UserStatsAggregateRow,
} from '../_lib/userStatsSupabase';
import { insightsHeroGradient, insightsHeroText } from '../_lib/themeContrast';
import { useTheme } from './ThemeContext';

function HeroBlur() {
  const [Blur, setBlur] = useState<React.ComponentType<{ intensity: number; tint: 'dark'; style: object }> | null>(null);
  useEffect(() => {
    void import('expo-blur').then((m) => setBlur(() => m.BlurView));
  }, []);
  if (!Blur) return null;
  return <Blur intensity={24} tint="dark" style={StyleSheet.absoluteFill} />;
}

function fmtBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return bytes > 0 ? `${bytes} B` : '0 B';
}

function fmtStorageFromMb(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0) return '0 MB';
  if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function fmtWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function InsightsScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string }>();
  const goBack = useExploreAwareBack();
  const { theme, themeId, language, user } = useTheme();
  const u = getLocaleUi(language);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totals, setTotals] = useState({ allTimeBytes: 0, allTimeItems: 0, sessionBytes: 0, sessionItems: 0 });
  const [aggregate, setAggregate] = useState<UserStatsAggregateRow | null>(null);
  const [emailStats, setEmailStats] = useState<EmailDetoxStats>({ bytes: 0, count: 0, batches: 0 });

  const [analytics, setAnalytics] = useState({
    totalMB: 0,
    totalCount: 0,
    photoMB: 0,
    photoCount: 0,
    ssMB: 0,
    ssCount: 0,
    vidMB: 0,
    vidCount: 0,
    liveMB: 0,
    liveCount: 0,
  });

  const heroPulse = useRef(new Animated.Value(0)).current;
  const heroEntrance = useRef(new Animated.Value(0)).current;

  const loadSupabase = useCallback(async () => {
    const sid = await getOrCreateStatsSessionId();
    setSessionId(sid);
    const email = await fetchEmailDetoxStats();
    setEmailStats(email);
    const effectiveUid = await resolveAuthUserId(user?.uid ?? '');
    if (!effectiveUid) {
      setTotals({ allTimeBytes: 0, allTimeItems: 0, sessionBytes: 0, sessionItems: 0 });
      setAggregate(null);
      return;
    }
    const [t, agg] = await Promise.all([
      fetchUserStatsTotals(effectiveUid, sid),
      fetchUserStatsAggregate(effectiveUid),
    ]);
    setTotals(t);
    setAggregate(agg);
  }, [user?.uid]);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted' && status !== 'limited') return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 8000,
        mediaType: ['photo', 'video'],
      });
      let totalMB = 0, ssMB = 0, vidMB = 0, photoMB = 0, liveMB = 0;
      let ssCount = 0, vidCount = 0, photoCount = 0, liveCount = 0;
      assets.forEach((a) => {
        const est =
          estimateAssetBytes({
            mediaType: a.mediaType === 'video' ? 'video' : 'photo',
            width: a.width,
            height: a.height,
            duration: a.duration,
          }) / (1024 * 1024);
        totalMB += est;
        const subs = (a as { mediaSubtypes?: string[] }).mediaSubtypes ?? [];
        if (a.mediaType === 'video') {
          vidMB += est;
          vidCount++;
          return;
        }
        if (subs.includes('screenshot')) {
          ssMB += est;
          ssCount++;
          return;
        }
        if (subs.includes('photoLive') || subs.includes('livePhoto')) {
          liveMB += est;
          liveCount++;
          return;
        }
        photoMB += est;
        photoCount++;
      });
      setAnalytics({
        totalMB,
        totalCount: assets.length,
        photoMB,
        photoCount,
        ssMB,
        ssCount,
        vidMB,
        vidCount,
        liveMB,
        liveCount,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    Animated.spring(heroEntrance, { toValue: 1, friction: 9, useNativeDriver: true }).start();
  }, [heroEntrance, heroPulse]);

  useEffect(() => {
    (async () => {
      await loadAnalytics(false);
      await loadSupabase();
      setLoading(false);
    })();
    const unsub = navigation.addListener('focus', () => {
      void loadAnalytics(false);
      void loadSupabase();
    });
    return unsub;
  }, [navigation, loadAnalytics, loadSupabase]);

  const handleNewSession = async () => {
    await resetStatsSession();
    const sid = await getStatsSessionId();
    setSessionId(sid);
    await loadSupabase();
  };

  const maxVal = Math.max(analytics.photoMB, analytics.ssMB, analytics.vidMB, analytics.liveMB, emailStats.bytes / (1024 * 1024), 1);
  const emailMb = emailStats.bytes / (1024 * 1024);
  const accountDeletedItems = aggregate?.total_photos_deleted ?? totals.allTimeItems;
  const accountDeletedMb =
    aggregate?.total_storage_freed_mb != null
      ? aggregate.total_storage_freed_mb
      : totals.allTimeBytes / (1024 * 1024);
  const pulseScale = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const heroGrad = insightsHeroGradient(themeId, theme);
  const heroTxt = insightsHeroText(theme, heroGrad);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loaderTxt, { color: theme.textSub }]}>{u.insightsLibrary}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {(params.from === 'explore' || params.from === 'features' || params.from === 'generals' || params.from === 'calendar') ? (
          <AppHeader variant="detail" onBack={goBack} subtitle={u.insightsTitle} />
        ) : null}

        <TouchableOpacity
          style={[styles.refreshFab, { backgroundColor: theme.accent, top: (params.from === 'explore' || params.from === 'features' || params.from === 'generals' || params.from === 'calendar') ? 108 : 56 }]}
          onPress={() => {
            void loadAnalytics(true);
            void loadSupabase();
          }}
          disabled={refreshing}
        >
          {refreshing ? <ActivityIndicator color="#fff" size="small" /> : <RefreshCw size={18} color="#fff" />}
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: heroEntrance, transform: [{ scale: pulseScale }] }}>
            <LinearGradient colors={heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderColor: heroTxt.border }]}>
              {Platform.OS === 'ios' && theme.isDark ? <HeroBlur /> : null}
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Sparkles size={16} color={heroTxt.badge} />
                  <Text style={[styles.heroBadgeTxt, { color: heroTxt.badge }]}>{u.insightsStorageReclaimed}</Text>
                </View>
                <Text style={[styles.heroKicker, { color: heroTxt.kicker }]}>{u.insightsSession}</Text>
                <Text style={[styles.heroBig, { color: heroTxt.big }]}>{fmtBytes(totals.sessionBytes)}</Text>
                <Text style={[styles.heroSub, { color: heroTxt.sub }]}>
                  {totals.sessionItems} {u.insightsDeletedCount} · {fmtStorageFromMb(totals.sessionBytes / (1024 * 1024))} {u.insightsDeletedSpace}
                </Text>
                <View style={[styles.heroDivider, { backgroundColor: heroTxt.divider }]} />
                <Text style={[styles.heroKicker, { color: heroTxt.kicker }]}>{u.insightsAllTime}</Text>
                <Text style={[styles.heroMid, { color: heroTxt.mid }]}>{fmtStorageFromMb(accountDeletedMb)}</Text>
                <Text style={[styles.heroSub, { color: heroTxt.sub }]}>
                  {accountDeletedItems} {u.insightsDeletedCount} · {fmtStorageFromMb(accountDeletedMb)} {u.insightsDeletedSpace}
                </Text>
                <TouchableOpacity style={[styles.heroBtn, { backgroundColor: heroTxt.btnBg }]} onPress={() => void handleNewSession()}>
                  <Text style={[styles.heroBtnTxt, { color: heroTxt.btnTxt }]}>{u.insightsNewSession}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{u.insightsAccountTotals}</Text>
          {(() => {
            const hasAny =
              aggregate != null ||
              totals.allTimeItems > 0 ||
              totals.allTimeBytes > 0 ||
              totals.sessionItems > 0 ||
              totals.sessionBytes > 0;
            if (!hasAny) {
              return (
                <Text style={[styles.empty, { color: theme.textSub }]}>
                  {u.insightsEmptyHint}
                </Text>
              );
            }
            return (
            <View style={[styles.actRow, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actMain, { color: theme.text }]}>
                  {accountDeletedItems} {u.insightsDeletedCount} · {fmtStorageFromMb(accountDeletedMb)} {u.insightsDeletedSpace}
                </Text>
                <Text style={[styles.actWhen, { color: theme.textSub, marginTop: 6 }]}>
                  {aggregate?.last_session_at
                    ? `Last cleanup · ${fmtWhen(aggregate.last_session_at)}`
                    : totals.sessionItems > 0
                      ? 'Cloud row syncs on your next successful save to account.'
                      : 'Open Swipe and confirm a delete to start your log.'}
                </Text>
                {(aggregate?.current_streak_days ?? 0) > 0 || (aggregate?.longest_streak_days ?? 0) > 0 ? (
                  <Text style={[styles.actSrc, { color: theme.textMuted }]}>
                    streak {aggregate?.current_streak_days ?? 0}d · best {aggregate?.longest_streak_days ?? 0}d
                    {aggregate?.total_sessions ? ` · ${aggregate.total_sessions} sessions` : ''}
                  </Text>
                ) : null}
                {emailStats.count > 0 ? (
                  <Text style={[styles.actSrc, { color: theme.accent, marginTop: 6 }]}>
                    {u.insightsGmail}: {emailStats.count.toLocaleString()} emails · {fmtStorageFromMb(emailMb)} · {emailStats.batches} batch{emailStats.batches === 1 ? '' : 'es'}
                  </Text>
                ) : null}
                {aggregate?.updated_at ? (
                  <Text style={[styles.actSrc, { color: theme.textMuted, marginTop: 4 }]}>
                    updated {fmtWhen(aggregate.updated_at)}
                  </Text>
                ) : null}
              </View>
              <Zap size={18} color={theme.accent} />
            </View>
            );
          })()}

          <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 18 }]}>{u.insightsLibrary}</Text>
          <View style={styles.grid}>
            <MetricTile theme={theme} label={u.insightsAllMedia} value={fmtStorageFromMb(analytics.totalMB)} sub={`${analytics.totalCount}`} color="#a78bfa" icon={<TrendingUp size={16} color="#a78bfa" />} />
            <MetricTile theme={theme} label={u.insightsGmail} value={fmtStorageFromMb(emailMb)} sub={`${emailStats.count} emails`} color={theme.accent} icon={<Mail size={16} color={theme.accent} />} />
          </View>

          <View style={[styles.barCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Text style={[styles.barTitle, { color: theme.textMuted }]}>{u.insightsBreakdown}</Text>
            <BarLine label={u.insightsPhotos} mb={analytics.photoMB} max={maxVal} color="#c084fc" n={analytics.photoCount} theme={theme} />
            <BarLine label={u.insightsScreenshots} mb={analytics.ssMB} max={maxVal} color="#22d3ee" n={analytics.ssCount} theme={theme} />
            <BarLine label={u.insightsLivePhotos} mb={analytics.liveMB} max={maxVal} color="#f472b6" n={analytics.liveCount} theme={theme} />
            <BarLine label={u.insightsVideos} mb={analytics.vidMB} max={maxVal} color="#fb923c" n={analytics.vidCount} theme={theme} />
            <BarLine
              label={u.insightsGmail}
              mb={emailMb}
              max={maxVal}
              color={theme.accent}
              n={emailStats.count}
              theme={theme}
              hint={emailStats.count > 0 ? u.insightsGmailHint : 'Run email clean from Features'}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MetricTile({ theme, label, value, sub, color, icon }: any) {
  return (
    <View style={[styles.tile, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
      <View style={styles.tileTop}>
        {icon}
        <Text style={[styles.tileLbl, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.tileVal, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileSub, { color: theme.textSub }]}>{sub}</Text>
    </View>
  );
}

function BarLine({ label, mb, max, color, n, theme, hint }: any) {
  const pct = mb > 0 ? Math.max(5, Math.min(100, (mb / max) * 100)) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.barHead}>
        <Text style={[styles.barLbl, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.barN, { color: theme.textSub }]}>{n}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color, minWidth: mb > 0 ? 4 : 0 }]} />
      </View>
      <Text style={[styles.barMb, { color: mb > 0 ? color : theme.textMuted }]}>
        {mb > 0 ? fmtStorageFromMb(mb) : hint ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  scroll: { paddingBottom: 120, paddingHorizontal: 16 },
  refreshFab: {
    position: 'absolute',
    right: 18,
    zIndex: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  hero: {
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroContent: { padding: 22 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  heroBadgeTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  heroKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroBig: { fontSize: 44, fontWeight: '900', marginTop: 4 },
  heroMid: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroSub: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  heroDivider: { height: 1, marginVertical: 14 },
  heroBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  heroBtnTxt: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  singleTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 18,
  },
  singleTickerTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, flex: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  empty: { fontSize: 13, marginBottom: 12 },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  actWhen: { fontSize: 11, fontWeight: '700' },
  actMain: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  actSrc: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tileLbl: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  tileVal: { fontSize: 20, fontWeight: '900' },
  tileSub: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  barCard: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 14 },
  barTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLbl: { fontSize: 13, fontWeight: '800' },
  barN: { fontSize: 12, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barMb: { fontSize: 12, fontWeight: '900', marginTop: 4 },
});
