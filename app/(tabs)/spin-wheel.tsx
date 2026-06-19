/**
 * spin-wheel.tsx — Cyber-casino 3-reel swipe pack machine (photodumps).
 * Tiers: Basic / Plus / Max — watch rewarded ads, then spin for bonus swipes.
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MinimalBackButton } from '../components/MinimalBackButton';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { initMobileAds, showRewardedAd } from '../_lib/ads/admob';
import { recordSpinPurchase } from '../_lib/billingSupabase';
import { useTheme } from './ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LAYOUT_W = Math.min(SCREEN_W, 520);
const SYMBOL_H = 72;
/** Exactly 3 symbol rows visible — avoids “empty” gaps like real slot windows */
const REEL_H = SYMBOL_H * 3;

const BEZIER_SPIN = Easing.bezier(0.45, 0.05, 0.55, 0.95);
/** Matches `(tabs)/_layout.tsx` tab bar: `64 + insets.bottom` */
const TAB_BAR_HEIGHT = 64;

type Prize = { swipes: number; label: string; color: string; symbolLine1: string; symbolLine2: string; prob: number };

const TIERS = [
  {
    id: 'basic',
    label: 'BASIC',
    adCount: 1,
    adLabel: '1 ad',
    accentColor: '#00C2FF',
    prizes: [
      { swipes: 30, label: '30 Swipes', color: '#00C2FF', symbolLine1: '30', symbolLine2: 'SWIPES', prob: 0.97 },
      { swipes: 50, label: '50 Swipes', color: '#BF5AF2', symbolLine1: '50', symbolLine2: 'SWIPES', prob: 0.02 },
      { swipes: 80, label: '80 Swipes', color: '#FFD600', symbolLine1: '80', symbolLine2: 'SWIPES', prob: 0.01 },
    ] as Prize[],
  },
  {
    id: 'plus',
    label: 'PLUS',
    adCount: 3,
    adLabel: '3 ads',
    accentColor: '#BF5AF2',
    prizes: [
      { swipes: 90, label: '90 Swipes', color: '#BF5AF2', symbolLine1: '90', symbolLine2: 'SWIPES', prob: 0.98 },
      { swipes: 120, label: '120 Swipes', color: '#FF8C00', symbolLine1: '120', symbolLine2: 'SWIPES', prob: 0.01 },
      { swipes: 150, label: '150 Swipes', color: '#FFD600', symbolLine1: '150', symbolLine2: 'SWIPES', prob: 0.01 },
    ] as Prize[],
  },
  {
    id: 'max',
    label: 'MAX',
    adCount: 7,
    adLabel: '7 ads',
    accentColor: '#FFD600',
    prizes: [
      { swipes: 260, label: '260 Swipes', color: '#FFD600', symbolLine1: '260', symbolLine2: 'SWIPES', prob: 0.99 },
      { swipes: 380, label: '380 Swipes', color: '#FF8C00', symbolLine1: '380', symbolLine2: 'SWIPES', prob: 0.005 },
      { swipes: 500, label: '500 Swipes', color: '#FF0055', symbolLine1: '500', symbolLine2: 'SWIPES', prob: 0.005 },
    ] as Prize[],
  },
] as const;

async function watchRewardedAds(count: number): Promise<boolean> {
  for (let i = 0; i < count; i += 1) {
    const ok = await showRewardedAd(() => undefined);
    if (!ok) return false;
  }
  return true;
}

function rollPrize(prizes: readonly Prize[]): Prize {
  const r = Math.random(); let cum = 0;
  for (const p of prizes) { cum += p.prob; if (r < cum) return p; }
  return prizes[0];
}

function SymbolStrip({ strip, totalHeight }: { strip: Prize[]; totalHeight: number }) {
  return (
    <View style={[rl.stripInner, { height: totalHeight }]} collapsable={false}>
      {strip.map((prize, i) => (
        <View key={i} style={[rl.symbol, { height: SYMBOL_H }]}>
          {/*
            Avoid LinearGradient inside the scrolling strip: on some Android builds, Text under
            transform/animated layers + native gradients never paints again after scroll starts.
          */}
          <View
            style={[
              rl.symbolGrad,
              { backgroundColor: prize.color + '24', borderColor: prize.color + '55', borderWidth: 1 },
            ]}
          >
            <Text style={[rl.symNum, { color: prize.color }]} allowFontScaling={false}>
              {prize.symbolLine1}
            </Text>
            <Text style={[rl.symLabel, { color: prize.color + 'CC' }]} allowFontScaling={false}>
              {prize.symbolLine2}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function buildStrip(prizes: readonly Prize[], repeats: number): Prize[] {
  const out: Prize[] = [];
  for (let r = 0; r < repeats; r += 1) out.push(...prizes);
  return out;
}

function Reel({
  prizes, targetIdx, spinning, onDone, accentColor, reelIndex,
}: {
  prizes: readonly Prize[];
  targetIdx: number;
  spinning: boolean;
  onDone: () => void;
  accentColor: string;
  reelIndex: number;
}) {
  /** Must exceed landing row index (see spin math) or reels scroll past content and show blank. */
  const strip = useMemo(() => buildStrip(prizes, 50), [prizes]);
  const stripHeight = strip.length * SYMBOL_H;
  const maxScroll = Math.max(0, stripHeight - REEL_H);
  const scrollRef = useRef<ScrollView>(null);
  /** Positive content offset (same as ScrollView scroll Y). */
  const scrollPos = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const safeTargetIdx = Math.max(0, Math.min(targetIdx, prizes.length - 1));

  useEffect(() => {
    if (!spinning) return;
    doneRef.current = false;
    scrollPos.stopAnimation();
    const len = prizes.length;
    const targetRow = len * 18 + safeTargetIdx;
    const extraRows = len * 14;
    const landingRow = extraRows + targetRow;
    const baseScroll = landingRow * SYMBOL_H - SYMBOL_H;
    const overshootScroll = Math.min(baseScroll + 10, maxScroll);
    const startRow = len * 6 + Math.floor(Math.random() * len);
    const startScroll = startRow * SYMBOL_H - SYMBOL_H;

    const clampScroll = (y: number) => Math.min(Math.max(0, y), maxScroll);

    const syncScroll = (y: number) => {
      scrollRef.current?.scrollTo({ y: clampScroll(Math.round(y)), animated: false });
    };

    scrollPos.setValue(startScroll);
    syncScroll(startScroll);

    const sub = scrollPos.addListener(({ value }) => { syncScroll(value); });

    const spinMainMs = 4200 + reelIndex * 2600;
    const seq = Animated.sequence([
      Animated.timing(scrollPos, {
        toValue: overshootScroll,
        duration: spinMainMs,
        easing: BEZIER_SPIN,
        useNativeDriver: false,
      }),
      Animated.spring(scrollPos, {
        toValue: Math.min(baseScroll, maxScroll),
        friction: 8,
        tension: 95,
        useNativeDriver: false,
      }),
    ]);
    seq.start(({ finished }) => {
      if (finished && !doneRef.current) {
        doneRef.current = true;
        syncScroll(Math.min(baseScroll, maxScroll));
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDoneRef.current();
      }
    });
    return () => {
      scrollPos.removeListener(sub);
      scrollPos.stopAnimation();
    };
  }, [spinning, safeTargetIdx, prizes, reelIndex, scrollPos, maxScroll]);

  return (
    <View style={[rl.reel, { borderColor: accentColor + '55' }]}>
      <ScrollView
        ref={scrollRef}
        style={rl.scrollPort}
        contentContainerStyle={{ height: stripHeight }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        /** Android default true drops off-screen rows; combined with fast scroll that erases all Text. */
        removeClippedSubviews={false}
        nestedScrollEnabled={false}
        {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
      >
        <SymbolStrip strip={strip} totalHeight={stripHeight} />
      </ScrollView>
      <LinearGradient colors={['#0A0018', 'rgba(4,0,12,0)']} style={rl.maskTop} pointerEvents="none" />
      <LinearGradient colors={['rgba(5,0,8,0)', '#050008']} style={rl.maskBot} pointerEvents="none" />
      <View style={[rl.winLine, { borderColor: accentColor + '99' }]} pointerEvents="none" />
    </View>
  );
}

const rl = StyleSheet.create({
  reel:       {
    position: 'relative',
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: REEL_H,
    borderWidth: 1.5,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#04000C',
  },
  scrollPort: { zIndex: 2, height: REEL_H, width: '100%' },
  stripInner: { width: '100%' },
  maskTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 5 },
  maskBot:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 5 },
  winLine:    { position: 'absolute', top: REEL_H / 2 - SYMBOL_H / 2, left: 0, right: 0, height: SYMBOL_H, borderTopWidth: 1, borderBottomWidth: 1, zIndex: 4 },
  symbol:     { alignItems: 'center', justifyContent: 'center' },
  symbolGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  symNum:     {
    fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 },
    includeFontPadding: false,
  },
  symLabel:   { fontSize: 8, fontWeight: '900', letterSpacing: 2.2, includeFontPadding: false },
});

function DriftOrb({ delay, size, top, color, style }: {
  delay: number; size: number; top: number; color: string;
  style?: { left?: number | string; right?: number | string };
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 5200 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 5200 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, t]);

  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.12,
        transform: [{ translateX: tx }, { translateY: ty }],
        ...style,
      }}
    />
  );
}

function ConfettiPiece({ i, tier, burstKey }: { i: number; tier: number; burstKey: number }) {
  const fall = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const palette = tier === 0
    ? ['#C0C0C0', '#E8E8E8', '#00C2FF', '#FFF']
    : tier === 1
      ? ['#FFD700', '#FFF8DC', '#BF5AF2', '#FFF']
      : ['#FFD700', '#FF0055', '#00FFA3', '#FFF'];

  const color = palette[i % palette.length];
  const left = (i * 37 + (i % 5) * 19) % (SCREEN_W - 8);
  const dur = 2200 + (i % 7) * 180;

  useEffect(() => {
    fall.setValue(-30 - (i % 4) * 10);
    rotate.setValue(0);
    Animated.parallel([
      Animated.timing(fall, { toValue: SCREEN_H + 40, duration: dur, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [tier, i, dur, fall, rotate, burstKey]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: 8,
        height: 12,
        borderRadius: 2,
        backgroundColor: color,
        transform: [{ translateY: fall }, { rotate: spin }],
        opacity: 0.85,
      }}
    />
  );
}

function CelebrationOverlay({
  active, tier, burstKey, shakeX,
}: { active: boolean; tier: number; burstKey: number; shakeX: Animated.Value }) {
  if (!active) return null;
  const count = tier === 2 ? 48 : tier === 1 ? 32 : 22;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shakeX }] }]} pointerEvents="none" key={burstKey}>
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiPiece key={`c-${burstKey}-${i}`} i={i} tier={tier} burstKey={burstKey} />
      ))}
      {tier === 2 ? (
        Array.from({ length: 22 }).map((_, i) => (
          <CashNote key={`$-${burstKey}-${i}`} i={i} burstKey={burstKey} />
        ))
      ) : null}
      {tier >= 1 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,215,0,0.06)' }]} />
      ) : null}
    </Animated.View>
  );
}

function CashNote({ i, burstKey }: { i: number; burstKey: number }) {
  const fall = useRef(new Animated.Value(-40)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const left = ((i * 53 + burstKey * 7) % (SCREEN_W - 36)) + (i % 3) * 8;
  const dur = 2800 + (i % 5) * 200;

  useEffect(() => {
    fall.setValue(-60 - (i % 6) * 12);
    drift.setValue(0);
    Animated.parallel([
      Animated.timing(fall, { toValue: SCREEN_H + 60, duration: dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(drift, { toValue: (i % 2 === 0 ? 1 : -1) * 24, duration: dur * 0.45, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: dur * 0.55, useNativeDriver: true }),
      ]),
    ]).start();
  }, [i, burstKey, dur, fall, drift]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: 34,
        height: 18,
        borderRadius: 3,
        backgroundColor: '#1a7f37',
        borderWidth: 1,
        borderColor: '#FFD700',
        transform: [{ translateY: fall }, { translateX: drift }, { rotate: `${(i % 2 === 0 ? -1 : 1) * 18}deg` }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFD700',
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>RM</Text>
    </Animated.View>
  );
}

export default function SpinWheelScreen() {
  const goBack = useExploreAwareBack('generals');
  const insets = useSafeAreaInsets();
  const scrollBottomPad = TAB_BAR_HEIGHT + insets.bottom + 36;
  const { addBonusSwipes, user } = useTheme();
  const [tierIdx, setTierIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [targetIdxs, setTargetIdxs] = useState([0, 0, 0]);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [adBusy, setAdBusy] = useState(false);

  const doneCounts = useRef(0);
  const pendingPrize = useRef<Prize | null>(null);
  const wonScale = useRef(new Animated.Value(0)).current;
  const winPulse = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const floorSheen = useRef(new Animated.Value(0)).current;

  const tier = TIERS[tierIdx];

  useEffect(() => {
    void initMobileAds();
  }, []);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bgPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(bgPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ])).start();
  }, [bgPulse]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floorSheen, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(floorSheen, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [floorSheen]);

  const casinoBorderColor = bgPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,214,0,0.25)', 'rgba(255,0,85,0.55)'],
  });

  const glowColor = tier.accentColor;

  const triggerWinShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!wonPrize) return;
    winPulse.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(winPulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(winPulse, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
    ).start();
    return () => { winPulse.stopAnimation(); };
  }, [wonPrize, winPulse]);

  const startSpinAnimation = () => {
    setShowCelebration(false);
    const prize = rollPrize(tier.prizes);
    pendingPrize.current = prize;
    doneCounts.current = 0;
    setWonPrize(null);
    wonScale.setValue(0);
    const rawIdx = tier.prizes.findIndex(p => p.swipes === prize.swipes);
    const prizeIdx = rawIdx >= 0 ? rawIdx : 0;
    setTargetIdxs([prizeIdx, prizeIdx, prizeIdx]);
    setSpinning(true);
  };

  const handleSpin = async () => {
    if (spinning || adBusy) return;
    if (Platform.OS !== 'ios') {
      Alert.alert('Ads unavailable', 'Rewarded ads are available on the iOS app.');
      return;
    }
    setAdBusy(true);
    try {
      const watched = await watchRewardedAds(tier.adCount);
      if (!watched) {
        Alert.alert(
          'Ad not finished',
          tier.adCount === 1
            ? 'Watch the full ad to spin the wheel.'
            : `Watch all ${tier.adCount} ads to spin the wheel.`,
        );
        return;
      }
      startSpinAnimation();
    } finally {
      setAdBusy(false);
    }
  };

  const addBonusSwipesRef = useRef(addBonusSwipes);
  addBonusSwipesRef.current = addBonusSwipes;

  const handleReelDone = useCallback(() => {
    doneCounts.current += 1;
    if (doneCounts.current >= 3) {
      setSpinning(false);
      const p = pendingPrize.current;
      if (p) {
        setWonPrize(p);
        setCelebrationKey((k) => k + 1);
        setShowCelebration(true);
        triggerWinShake();
        void addBonusSwipesRef.current(p.swipes);
        if (user?.uid) {
          void recordSpinPurchase({
            userId: user.uid,
            tier: tier.id,
            amountMyrDisplay: tier.adLabel,
            swipesWon: p.swipes,
          });
        }
        Animated.spring(wonScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [tier.adLabel, tier.id, user?.uid]);

  const floorOpacity = floorSheen.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={{ flex: 1, backgroundColor: '#020008' }}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#020008', '#0A0020', '#03000C']} style={StyleSheet.absoluteFill} />
        <DriftOrb delay={0}   size={220} top={80}  color={glowColor} style={{ left: '-12%' }} />
        <DriftOrb delay={400} size={180} top={260} color="#FF0055" style={{ right: '-8%' }} />
        <DriftOrb delay={800} size={260} top={420} color="#BF5AF2" style={{ left: '18%' }} />
        <Animated.View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: SCREEN_H * 0.35,
            opacity: floorOpacity,
          }}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,0,85,0.08)', 'rgba(0,194,255,0.06)']}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>

      <CelebrationOverlay active={showCelebration} tier={tierIdx} burstKey={celebrationKey} shakeX={shakeX} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.nav}>
          <MinimalBackButton onPress={goBack} color="rgba(255,255,255,0.72)" size={26} />
          <Text style={s.navTitle}>SWIPE WHEEL</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { maxWidth: LAYOUT_W, alignSelf: 'center', width: '100%', paddingBottom: scrollBottomPad }]}
        >

          <View style={s.header}>
            <LinearGradient colors={[glowColor + '28', glowColor + '08']} style={s.headerBadge}>
              <Sparkles size={14} color={glowColor} />
              <Text style={[s.headerBadgeTxt, { color: glowColor }]}>GUARANTEED PRIZE EVERY SPIN</Text>
            </LinearGradient>
            <Text style={s.headerTitle}>Spin to Win</Text>
            <Text style={s.headerSub}>Watch ads to spin — every spin pays out.</Text>
          </View>

          <View style={s.tierRow}>
            {TIERS.map((t, i) => (
              <TierArcadeButton
                key={t.id}
                label={t.label}
                adLabel={t.adLabel}
                accent={t.accentColor}
                selected={tierIdx === i}
                disabled={spinning || adBusy}
                onPress={() => { if (!spinning && !adBusy) { setTierIdx(i); setWonPrize(null); setShowCelebration(false); } }}
              />
            ))}
          </View>

          <View style={{ position: 'relative' }}>
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <Animated.View style={[s.machineOuter, { borderColor: casinoBorderColor, shadowColor: glowColor }]}>
                <LinearGradient
                  colors={['#2A2A3A', '#0B0B12', '#1A1A24', '#0E0E16']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.machineMetal}
                >
                  <View style={s.machineInner}>
                    <LinearGradient colors={[glowColor + '38', glowColor + '10']} style={s.machineTopBar}>
                      <Text style={[s.machineTopTxt, { color: glowColor }]}>◆ PHOTODUMPS JACKPOT ◆</Text>
                    </LinearGradient>

                    <View style={s.reelRow}>
                      {[0, 1, 2].map(reelIdx => (
                        <Reel
                          key={`reel-${tierIdx}-${reelIdx}`}
                          prizes={tier.prizes}
                          targetIdx={targetIdxs[reelIdx]}
                          spinning={spinning}
                          onDone={handleReelDone}
                          accentColor={glowColor}
                          reelIndex={reelIdx}
                        />
                      ))}
                    </View>

                    <View style={s.machineDots}>
                      {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <Animated.View
                          key={i}
                          style={[s.machineDot, {
                            backgroundColor: glowColor,
                            opacity: bgPulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [i % 2 === 0 ? 0.25 : 0.45, i % 2 === 0 ? 0.55 : 0.25],
                            }),
                          }]}
                        />
                      ))}
                    </View>

                    {wonPrize ? (
                      <Animated.View style={[s.winBannerAbs, { transform: [{ scale: wonScale }] }]}>
                        <LinearGradient
                          colors={[wonPrize.color, wonPrize.color + 'CC']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={s.winGrad}
                        >
                          <View style={s.winLeft}>
                            <Text style={s.winTitle}>GRAND PRIZE</Text>
                            <Animated.View style={{ opacity: winPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }}>
                              <Text
                                style={[s.winAmt, {
                                  textShadowColor: 'rgba(255,255,255,0.85)',
                                  textShadowRadius: 16,
                                  textShadowOffset: { width: 0, height: 0 },
                                }]}
                              >
                                {wonPrize.label}
                              </Text>
                            </Animated.View>
                          </View>
                          <Sparkles size={26} color="rgba(255,255,255,0.85)" />
                        </LinearGradient>
                      </Animated.View>
                    ) : null}
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </View>

          <TouchableOpacity onPress={() => { void handleSpin(); }} disabled={spinning || adBusy} activeOpacity={0.85} style={{ marginTop: wonPrize ? 8 : 12 }}>
            <LinearGradient
              colors={spinning || adBusy ? ['#1A1A1A', '#111'] : [glowColor, glowColor + 'AA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.spinBtn}
            >
              <Zap size={20} color={spinning || adBusy ? '#555' : '#000'} />
              <Text style={[s.spinBtnTxt, { color: spinning || adBusy ? '#555' : '#000' }]}>
                {adBusy
                  ? `WATCHING AD${tier.adCount > 1 ? 'S' : ''}…`
                  : spinning
                    ? 'SPINNING…'
                    : `WATCH ${tier.adCount} AD${tier.adCount > 1 ? 'S' : ''} & SPIN`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={s.spinNote}>Every spin wins · {tier.adLabel} required</Text>

          <View style={[s.compareCard, { borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={s.compareHead}>COMPARE TIERS</Text>
            {TIERS.map((t, i) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => { if (!spinning && !adBusy) { setTierIdx(i); setWonPrize(null); setShowCelebration(false); } }}
                style={[s.compareRow, { borderColor: tierIdx === i ? t.accentColor + '55' : 'transparent', backgroundColor: tierIdx === i ? t.accentColor + '10' : 'transparent' }]}
              >
                <View style={[s.compareDot, { backgroundColor: t.accentColor }]} />
                <Text style={[s.compareLabel, { color: t.accentColor }]}>{t.label}</Text>
                <Text style={s.compareDesc}>
                  {t.prizes.map((p) => p.swipes).join(' / ')} swipes
                </Text>
                <Text style={[s.comparePrice, { color: tierIdx === i ? '#FFF' : 'rgba(255,255,255,0.45)' }]}>{t.adLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 12 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TierArcadeButton({
  label, adLabel, accent, selected, disabled, onPress,
}: {
  label: string; adLabel: string; accent: string; selected: boolean; disabled: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 6 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();

  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} disabled={disabled} style={{ flex: 1 }}>
      <Animated.View style={[
        tb.wrap,
        {
          borderColor: selected ? accent : 'rgba(255,255,255,0.1)',
          backgroundColor: selected ? accent + '18' : 'rgba(255,255,255,0.03)',
          shadowColor: accent,
          shadowOpacity: selected ? 0.55 : 0,
          shadowRadius: selected ? 14 : 0,
          transform: [{ scale }],
        },
      ]}>
        <Text style={[tb.label, { color: selected ? accent : 'rgba(255,255,255,0.35)' }]}>{label}</Text>
        <Text style={[tb.price, { color: selected ? '#FFF' : 'rgba(255,255,255,0.28)' }]}>{adLabel}</Text>
      </Animated.View>
    </Pressable>
  );
}

const tb = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  price: { fontSize: 13, fontWeight: '800' },
});

const s = StyleSheet.create({
  nav:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  navTitle:  { flex: 1, color: '#FFF', fontSize: 17, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },

  scroll:    { paddingHorizontal: 20, flexGrow: 1 },

  header:    { alignItems: 'center', paddingTop: 6, paddingBottom: 18, gap: 8 },
  headerBadge:{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  headerBadgeTxt:{ fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  headerTitle:{ color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontWeight: '500', textAlign: 'center' },

  tierRow:   { flexDirection: 'row', gap: 8, marginBottom: 18 },

  machineOuter: {
    borderWidth: 2,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 18,
  },
  machineMetal: { padding: 3, borderRadius: 28 },
  machineInner: { borderRadius: 25, overflow: 'hidden', backgroundColor: '#05000E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  machineTopBar:{ paddingVertical: 10, alignItems: 'center' },
  machineTopTxt:{ fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  reelRow:   { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  machineDots:{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  machineDot: { width: 7, height: 7, borderRadius: 3.5 },

  winBannerAbs: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 20,
  },
  winGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  winLeft:   { gap: 2 },
  winTitle:  { color: 'rgba(0,0,0,0.65)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  winAmt:    { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  spinBtn:   { borderRadius: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinBtnTxt:{ fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  spinNote:  { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 8, marginBottom: 18 },

  compareCard:{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, gap: 6 },
  compareHead:{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10 },
  compareDot: { width: 8, height: 8, borderRadius: 4 },
  compareLabel:{ fontSize: 11, fontWeight: '900', width: 44 },
  compareDesc:{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600', flex: 1 },
  comparePrice:{ fontSize: 13, fontWeight: '800' },
});
