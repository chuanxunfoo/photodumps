import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Calendar, ChevronDown, Flame, Image as ImageIcon, Shuffle, Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Pressable,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { GlassTicker } from '../components/GlassTicker';
import {
  getPhotoAccessStatus,
  requestPhotoAccessFromUser,
  type PhotoAccessStatus,
} from '../_lib/firstLaunchPermissions';
import {
  countAssetsInRange,
  countRandomVaultAssets,
  monthRange,
  RANDOM_VAULT,
} from '../_lib/mediaArchive';
import {
  CALENDAR_SLOT,
  calendarDeepCleanGradient,
  contrastOnGradient,
} from '../components/hub/hubBarThemes';
import { calendarBannerGradient, monthRowGradient, tickerHuesForTheme, tickerTextColorForTheme } from '../components/hub/exploreUi';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width, height } = Dimensions.get('window');

// ─── MONTH DATA ───────────────────────────────────────────────────────
const MONTH_DATA = [
  { name: 'JANUARY', short: 'JAN', num: 1 },
  { name: 'FEBRUARY', short: 'FEB', num: 2 },
  { name: 'MARCH', short: 'MAR', num: 3 },
  { name: 'APRIL', short: 'APR', num: 4 },
  { name: 'MAY', short: 'MAY', num: 5 },
  { name: 'JUNE', short: 'JUN', num: 6 },
  { name: 'JULY', short: 'JUL', num: 7 },
  { name: 'AUGUST', short: 'AUG', num: 8 },
  { name: 'SEPTEMBER', short: 'SEP', num: 9 },
  { name: 'OCTOBER', short: 'OCT', num: 10 },
  { name: 'NOVEMBER', short: 'NOV', num: 11 },
  { name: 'DECEMBER', short: 'DEC', num: 12 },
];

const YEARS = [2026, 2025, 2024, 2023, 2022];

// ─── YEAR PICKER ─────────────────────────────────────────────────────
function YearPicker({ visible, year, onSelect, onClose, theme, t }: any) {
  const slide = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 0 : 400, friction: 14, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={{ backgroundColor: theme.bg2, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, transform: [{ translateY: slide }] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginTop: 14, marginBottom: 20 }} />
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginBottom: 12 }}>{t.selectYear}</Text>
            {YEARS.map(y => (
              <TouchableOpacity key={y} onPress={() => { onSelect(y); onClose(); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 28, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ flex: 1, color: y === year ? theme.accent : theme.text, fontSize: 26, fontWeight: '900' }}>{y}</Text>
                {y === year && (
                  <View style={{ backgroundColor: theme.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>{t.current}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── MONTH ROW ────────────────────────────────────────────────────────
// Full-width coloured rows like the reference image, each row = one month
function MonthRow({ item, count, onPress, delay, year, colors, isRandom = false }: {
  item: typeof MONTH_DATA[0] | typeof RANDOM_VAULT;
  count: number;
  onPress: () => void;
  delay: number;
  year: number;
  colors: [string, string];
  isRandom?: boolean;
}) {
  const entrance  = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1, duration: 450, delay,
      easing: Easing.out(Easing.back(1.08)), useNativeDriver: true,
    }).start();
  }, []);

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const isFuture = year > cy || (year === cy && item.num > cm);

  const isCurrentYear = year === cy;
  const isPast        = isCurrentYear && item.num < cm;
  const isCurrent     = isCurrentYear && item.num === cm;
  const tone = contrastOnGradient(colors);

  return (
    <Animated.View style={{
      opacity: entrance,
      transform: [
        { translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
      ],
      marginHorizontal: 14, marginVertical: 3,
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      <Pressable
        disabled={isFuture}
        onPressIn={isFuture ? undefined : () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, friction: 5 }).start()}
        onPressOut={isFuture ? undefined : () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={isFuture ? undefined : onPress}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <View style={{ position: 'relative' }}>
            <LinearGradient
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[mr.row, { opacity: isPast ? 0.9 : 1 }]}
            >
              <View style={mr.orb} pointerEvents="none" />

              <View style={mr.textCol}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[mr.monthName, { color: tone.titleColor }]}
                >
                  {isRandom ? item.name : `${item.short} '${String(year).slice(2)}`}
                </Text>
                {isRandom ? (
                  <Text numberOfLines={2} style={[mr.countLabel, { color: tone.subtitleColor }]}>{RANDOM_VAULT.tagline}</Text>
                ) : count > 0 ? (
                  <Text style={[mr.countLabel, { color: tone.subtitleColor }]}>{count} items</Text>
                ) : null}
              </View>

              <View style={mr.badgeCol}>
                {isRandom ? (
                  <View style={mr.currentBadge}>
                    <Shuffle size={16} color="#FFF" />
                  </View>
                ) : isCurrent ? (
                  <View style={mr.currentBadge}>
                    <Sparkles size={16} color="#FFF" />
                  </View>
                ) : count > 0 ? (
                  <View style={mr.photoBadge}>
                    <Text style={mr.photoBadgeText}>{count}</Text>
                  </View>
                ) : (
                  <Text style={{ color: tone.subtitleColor, fontSize: 18, opacity: 0.45 }}>·</Text>
                )}
              </View>
            </LinearGradient>
            {isFuture && (
              <View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: 'rgba(0,0,0,0.52)',
                  borderRadius: 20,
                }}
              />
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const mr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 22,
    overflow: 'hidden', minHeight: 72,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  orb: {
    position: 'absolute', top: -30, right: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 0,
  },
  textCol: { flex: 1, minWidth: 0, zIndex: 2, paddingRight: 8 },
  badgeCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 4, flexShrink: 0, zIndex: 2 },
  monthName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  countLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  currentBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoBadge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  photoBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
export function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeId, t } = useTheme();
  const fonts = resolveTypeface(theme);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [randomCount, setRandomCount] = useState(0);
  const [photoAccess, setPhotoAccess] = useState<PhotoAccessStatus | 'unknown'>('unknown');
  const [requestingAccess, setRequestingAccess] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale   = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerScale,   { toValue: 1, friction: 8,   useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerScale]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void getPhotoAccessStatus().then((status) => {
        if (!cancelled) setPhotoAccess(status);
      });
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const result: Record<string, number> = {};
      for (const m of MONTH_DATA) {
        const { createdAfter, createdBefore } = monthRange(year, m.num - 1);
        result[m.short] = await countAssetsInRange(createdAfter, createdBefore);
      }
      setCounts(result);
      setRandomCount(await countRandomVaultAssets());
    } catch (e) {
      console.warn('[calendar] loadCounts failed', e);
    }
  }, [year]);

  useEffect(() => {
    if (photoAccess === 'granted' || photoAccess === 'limited') {
      void loadCounts();
    }
  }, [year, photoAccess, loadCounts]);

  const handleEnablePhotos = useCallback(async () => {
    if (requestingAccess) return;
    setRequestingAccess(true);
    try {
      const status = await requestPhotoAccessFromUser();
      setPhotoAccess(status);
      if (status === 'granted' || status === 'limited') {
        await loadCounts();
      }
    } finally {
      setRequestingAccess(false);
    }
  }, [loadCounts, requestingAccess]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const capsuleGrad = calendarBannerGradient(themeId, theme);
  const capsuleTone = contrastOnGradient(capsuleGrad);
  const deepGrad = calendarDeepCleanGradient(themeId);
  const deepTone = contrastOnGradient(deepGrad);
  const ink = theme.text;
  const inkSub = theme.textSub;

  const navigateToMonth = (monthName: string) => {
    router.push({
      pathname: '/dump',
      params: { month: monthName, year: year.toString() },
    });
  };

  const navigateToRandom = () => {
    router.push({
      pathname: '/dump',
      params: { mode: 'random_vault' },
    });
  };

  return (
    <View style={[cs.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: headerOpacity, transform: [{ scale: headerScale }] }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 36 }}
          >

            <AppHeader
              variant="tabs"
              endSlot={
                <TouchableOpacity
                  style={[cs.yearBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
                  onPress={() => setShowYearPicker(true)}
                  activeOpacity={0.85}
                >
                  <Text style={cs.yearTxt}>{year}</Text>
                  <ChevronDown size={14} color="#FFF" />
                </TouchableOpacity>
              }
              subtitle={`${total > 0 ? total : '—'} ${t.photos.toLowerCase()}`}
            />

            {photoAccess !== 'granted' && photoAccess !== 'limited' && (
              <TouchableOpacity
                style={[cs.accessBanner, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => void handleEnablePhotos()}
                disabled={requestingAccess}
                activeOpacity={0.85}
              >
                <ImageIcon size={18} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[cs.accessTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
                    {requestingAccess ? 'Connecting…' : 'Connect your camera roll'}
                  </Text>
                  <Text style={[cs.accessSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                    Tap to allow photo access and load your months
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <LinearGradient
              colors={capsuleGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[cs.capsuleStrip, { borderColor: capsuleTone.titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.1)' }]}
            >
              <Text style={[cs.capsuleEyebrow, { color: capsuleTone.titleColor }]} numberOfLines={1}>{t.timeCapsule}</Text>
              <Text style={[cs.capsuleLine, { color: capsuleTone.subtitleColor }]} numberOfLines={3}>{t.timeCapsuleLine}</Text>
            </LinearGradient>

            {/* Stats row */}
            <View style={cs.statsRow}>
              {[
                { icon: <ImageIcon size={16} color={inkSub} />, val: total > 0 ? total.toString() : '—', lbl: t.photos },
                { icon: <Calendar size={16} color={inkSub} />,  val: year.toString(),                     lbl: t.year   },
                { icon: <Sparkles size={16} color={inkSub} />,  val: '12',                                 lbl: t.months },
              ].map((s, i) => (
                <View key={i} style={[cs.statCard, {
                  backgroundColor: theme.bg2,
                  borderColor: theme.border,
                  borderRadius: theme.radiusMd,
                  borderWidth: theme.borderW,
                }]}>
                  {s.icon}
                  <Text style={[cs.statVal, { color: ink }]}>{s.val}</Text>
                  <Text style={[cs.statLbl, { color: inkSub }]}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            <GlassTicker
              text="PHOTODUMPS  •  AI PHOTO CLEANER  •  FREE YOUR STORAGE"
              speed={8000}
              hues={tickerHuesForTheme(themeId, theme)}
              textColor={tickerTextColorForTheme(themeId)}
              blurTint={theme.isDark ? 'dark' : 'light'}
            />

            {/* Deep clean CTA */}
            <TouchableOpacity
              style={[cs.deepBtn, { borderColor: deepTone.titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]}
              onPress={() => router.push({ pathname: '/dump', params: { mode: 'deep_clean' } })}
              activeOpacity={0.86}
            >
              <LinearGradient colors={deepGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cs.deepInner}>
                <View style={[cs.deepIcon, { backgroundColor: deepTone.titleColor === '#FFFFFF' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)' }]}>
                  <Flame size={24} color={deepTone.titleColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[cs.deepTitle, { color: deepTone.titleColor }]} numberOfLines={2}>{t.deepCleanMode}</Text>
                  <Text style={[cs.deepSub, { color: deepTone.subtitleColor }]} numberOfLines={3}>{t.deepCleanSub}</Text>
                </View>
                <Zap size={18} color={deepTone.titleColor} />
              </LinearGradient>
            </TouchableOpacity>

            <GlassTicker
              text={`JAN  FEB  MAR  APR  MAY  JUN  JUL  AUG  SEP  OCT  NOV  DEC  •  ${year}`}
              hues={tickerHuesForTheme(themeId, theme)}
              textColor={tickerTextColorForTheme(themeId)}
              blurTint={theme.isDark ? 'dark' : 'light'}
              speed={12000}
            />

            <View style={cs.sectionLbl}>
              <Shuffle size={11} color={inkSub} />
              <Text style={[cs.sectionLblText, { color: inkSub }]}>lost &amp; found</Text>
            </View>

            <View style={{ paddingBottom: 6 }}>
              <MonthRow
                item={RANDOM_VAULT}
                count={randomCount}
                year={year}
                delay={0}
                isRandom
                colors={monthRowGradient(themeId, CALENDAR_SLOT.random)}
                onPress={navigateToRandom}
              />
            </View>

            <View style={cs.sectionLbl}>
              <Sparkles size={11} color={inkSub} />
              <Text style={[cs.sectionLblText, { color: inkSub }]}>
                {t.monthlyArchive} — {year}
              </Text>
            </View>

            {/* Month list — swipewipe style, full-width rows */}
            <View style={{ paddingBottom: 8 }}>
              {MONTH_DATA.map((m, i) => (
                <MonthRow
                  key={m.short}
                  item={m}
                  count={counts[m.short] ?? 0}
                  year={year}
                  delay={(i + 1) * 45}
                  colors={monthRowGradient(themeId, CALENDAR_SLOT.jan + i)}
                  onPress={() => navigateToMonth(m.name)}
                />
              ))}
            </View>

            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: inkSub, fontSize: 9, fontWeight: '700', letterSpacing: 2 }}>photodumps · v3.0</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      <YearPicker visible={showYearPicker} year={year} onSelect={setYear} onClose={() => setShowYearPicker(false)} theme={theme} t={t} />
    </View>
  );
}

const cs = StyleSheet.create({
  root:     { flex: 1 },
  yearBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  yearTxt:    { color: '#FFF', fontWeight: '900', fontSize: 17 },
  capsuleStrip: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  capsuleEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  capsuleLine: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  statCard:   { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  statVal:    { fontSize: 17, fontWeight: '900' },
  statLbl:    { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  accessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  accessTitle: { fontSize: 14, fontWeight: '800' },
  accessSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  deepBtn:    { marginHorizontal: 16, marginVertical: 10, borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
  deepInner:  { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  deepIcon:   { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  deepTitle:  { fontSize: 15, fontWeight: '900' },
  deepSub:    { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionLbl: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  sectionLblText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'lowercase' },
});

export default function CalendarRoute() {
  return <Redirect href="/hub?page=calendar" />;
}
