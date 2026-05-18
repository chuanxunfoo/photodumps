import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, ChevronDown, Flame, Image as ImageIcon, Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Pressable,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width, height } = Dimensions.get('window');

// ─── TICKER ──────────────────────────────────────────────────────────
function Ticker({ text, bg, color, speed = 9000 }: { text: string; bg: string; color: string; speed?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = () => {
      anim.setValue(0);
      Animated.timing(anim, { toValue: -width, duration: speed, easing: Easing.linear, useNativeDriver: true }).start(() => run());
    };
    run();
    return () => anim.stopAnimation();
  }, []);
  const full = `${text}   •   ${text}   •   ${text}   •   `;
  return (
    <View style={{ height: 28, backgroundColor: bg, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: anim }] }}>
        {[0, 1, 2, 3].map(i => (
          <Text key={i} style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>{full}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── MONTH DATA ───────────────────────────────────────────────────────
const MONTH_DATA = [
  { name: 'JANUARY',   short: 'JAN', num: 1,  colors: ['#0D0033','#3D00D4','#6C00FF'] as const },
  { name: 'FEBRUARY',  short: 'FEB', num: 2,  colors: ['#200033','#8B00A8','#FF00D4'] as const },
  { name: 'MARCH',     short: 'MAR', num: 3,  colors: ['#002210','#006640','#00FF85'] as const },
  { name: 'APRIL',     short: 'APR', num: 4,  colors: ['#220008','#880030','#FF005C'] as const },
  { name: 'MAY',       short: 'MAY', num: 5,  colors: ['#221800','#886600','#FFD600'] as const },
  { name: 'JUNE',      short: 'JUN', num: 6,  colors: ['#000A22','#003088','#00A3FF'] as const },
  { name: 'JULY',      short: 'JUL', num: 7,  colors: ['#220500','#882200','#FF5500'] as const },
  { name: 'AUGUST',    short: 'AUG', num: 8,  colors: ['#220022','#880088','#FF00FF'] as const },
  { name: 'SEPTEMBER', short: 'SEP', num: 9,  colors: ['#221500','#885500','#FF8A00'] as const },
  { name: 'OCTOBER',   short: 'OCT', num: 10, colors: ['#111100','#446600','#CCFF00'] as const },
  { name: 'NOVEMBER',  short: 'NOV', num: 11, colors: ['#220A00','#882800','#FF3D00'] as const },
  { name: 'DECEMBER',  short: 'DEC', num: 12, colors: ['#001510','#005540','#00FFC8'] as const },
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
                <Text style={{ flex: 1, color: y === year ? '#FF0055' : theme.text, fontSize: 26, fontWeight: '900' }}>{y}</Text>
                {y === year && (
                  <View style={{ backgroundColor: '#FF0055', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
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
function MonthRow({ item, count, onPress, delay, year }: {
  item: typeof MONTH_DATA[0]; count: number; onPress: () => void; delay: number; year: number;
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
              colors={item.colors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[mr.row, { opacity: isPast ? 0.9 : 1 }]}
            >
              <View style={mr.orb} />

              <View style={{ flex: 1 }}>
                <Text style={mr.monthName}>{item.short}{" '"}{String(year).slice(2)}</Text>
              {count > 0 && (
                <Text style={mr.countLabel}>{count} items</Text>
              )}
              </View>

              <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                {isCurrent ? (
                  <View style={mr.currentBadge}>
                    <Sparkles size={16} color="#FFF" />
                  </View>
                ) : count > 0 ? (
                  <View style={mr.photoBadge}>
                    <Text style={mr.photoBadgeText}>{count}</Text>
                  </View>
                ) : (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>·</Text>
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
  },
  monthName: {
    color: '#FFFFFF', fontSize: 26, fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  countLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginTop: 2 },
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

let appSubPromptedThisLaunch = false;

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const { theme, t, isPro, isAdmin, openSubscription } = useTheme();
  const fonts = resolveTypeface(theme);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale   = useRef(new Animated.Value(0.97)).current;

  useFocusEffect(
    useCallback(() => {
      if (isPro || isAdmin || appSubPromptedThisLaunch) return;
      appSubPromptedThisLaunch = true;
      const timer = setTimeout(() => openSubscription(), 900);
      return () => clearTimeout(timer);
    }, [isPro, isAdmin, openSubscription]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerScale,   { toValue: 1, friction: 8,   useNativeDriver: true }),
    ]).start();
    loadCounts();
  }, [year]);

  const loadCounts = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const result: Record<string, number> = {};
      for (const m of MONTH_DATA) {
        const { totalCount } = await MediaLibrary.getAssetsAsync({
          first: 0, mediaType: ['photo', 'video'],
          createdAfter:  new Date(year, m.num - 1, 1).getTime(),
          createdBefore: new Date(year, m.num, 0, 23, 59, 59).getTime(),
        });
        result[m.short] = totalCount;
      }
      setCounts(result);
    } catch {}
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const navigateToMonth = (monthName: string) => {
    router.push({
      pathname: '/dump',
      params: { month: monthName, year: year.toString() },
    });
  };

  return (
    <View style={[cs.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: headerOpacity, transform: [{ scale: headerScale }] }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

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

            <LinearGradient
              colors={['rgba(255,0,85,0.22)', 'rgba(120,0,80,0.12)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cs.capsuleStrip}
            >
              <Text style={cs.capsuleEyebrow}>{t.timeCapsule}</Text>
              <Text style={cs.capsuleLine} numberOfLines={2}>{t.timeCapsuleLine}</Text>
            </LinearGradient>

            {/* Stats row */}
            <View style={cs.statsRow}>
              {[
                { icon: <ImageIcon size={16} color={theme.textSub} />, val: total > 0 ? total.toString() : '—', lbl: t.photos },
                { icon: <Calendar size={16} color={theme.textSub} />,  val: year.toString(),                     lbl: t.year   },
                { icon: <Sparkles size={16} color={theme.textSub} />,  val: '12',                                 lbl: t.months },
              ].map((s, i) => (
                <View key={i} style={[cs.statCard, {
                  backgroundColor: theme.bg2,
                  borderColor: theme.border,
                  borderRadius: theme.radiusMd,
                  borderWidth: theme.borderW,
                }]}>
                  {s.icon}
                  <Text style={[cs.statVal, { color: theme.text }]}>{s.val}</Text>
                  <Text style={[cs.statLbl, { color: theme.textSub }]}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            <Ticker text={`PHOTODUMPS  •  AI PHOTO CLEANER  •  FREE YOUR STORAGE`} bg={theme.accent} color="#FFF" speed={8000} />

            {/* Deep clean CTA */}
            <TouchableOpacity
              style={[cs.deepBtn, { borderColor: 'rgba(255,0,85,0.3)' }]}
              onPress={() => router.push({ pathname: '/dump', params: { mode: 'deep_clean' } })}
              activeOpacity={0.86}
            >
              <LinearGradient colors={['#220000', '#0D0000']} style={cs.deepInner}>
                <View style={cs.deepIcon}><Flame size={24} color="#FF0055" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={cs.deepTitle}>{t.deepCleanMode}</Text>
                  <Text style={cs.deepSub}>{t.deepCleanSub}</Text>
                </View>
                <Zap size={18} color="#FF0055" />
              </LinearGradient>
            </TouchableOpacity>

            <Ticker text={`JAN  FEB  MAR  APR  MAY  JUN  JUL  AUG  SEP  OCT  NOV  DEC  •  ${year}`} bg={theme.accent} color="#FFF" speed={12000} />

            {/* Section label */}
            <View style={cs.sectionLbl}>
              <Sparkles size={11} color={theme.accent} />
              <Text style={[cs.sectionLblText, { color: theme.textSub }]}>
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
                  delay={i * 45}
                  onPress={() => navigateToMonth(m.name)}
                />
              ))}
            </View>

            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 3 }}>PHOTODUMPS  •  v3.0  •  PHOTO CLEANER</Text>
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
    borderColor: 'rgba(255,0,85,0.25)',
  },
  capsuleEyebrow: {
    color: '#FF3377',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  capsuleLine: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  statCard:   { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  statVal:    { fontSize: 17, fontWeight: '900' },
  statLbl:    { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  deepBtn:    { marginHorizontal: 16, marginVertical: 10, borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
  deepInner:  { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  deepIcon:   { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,0,85,0.12)', justifyContent: 'center', alignItems: 'center' },
  deepTitle:  { color: '#FFF', fontSize: 15, fontWeight: '900' },
  deepSub:    { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionLbl: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  sectionLblText: { fontSize: 9, fontWeight: '900', letterSpacing: 4 },
});
