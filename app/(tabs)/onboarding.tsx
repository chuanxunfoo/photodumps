/**
 * photodumps onboarding — 6 slides, mobile-symmetric layout
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Scan,
  Trash2,
  X,
  Zap,
} from 'lucide-react-native';
import { HOBBY_WEEKLY_SWIPES } from '../_lib/appConfig';
import { markOnboardingComplete } from '../_lib/appLaunchFlow';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import {
  AlertStrip,
  BLUE,
  CYAN,
  GlitchNumber,
  GOLD,
  GREEN,
  GridBg,
  HOT,
  NeonStatCard,
  PAD,
  PURPLE,
  Scanlines,
  ScreenShake,
  ShockRing,
} from '../components/onboarding/OnboardFx';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_LOGO = require('../assets/brand-icon.png');
import { CountUpText } from '../components/onboarding/CountUp';

const SC_TARGET_END = 14821;
const SC_GB_END = 127;
const STATS_SESSION_GB = 127.4;
const STATS_ALLTIME_TB = 2.3;
const STATS_ITEMS_SESSION = 14821;
const STATS_ITEMS_ALL = 89400;
const STATS_FILES_PULSE = 89400;
const STATS_SCREENSHOTS = 2847;
const STATS_ALL_MEDIA_GB = 847;
const STATS_PHOTOS_GB = 312;
const STATS_VIDEOS_GB = 198;

const { width } = Dimensions.get('window');
const SLIDE_COUNT = 4;
const BG = '#FFFFFF';
const SYNE = Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-black', default: undefined });
const NAV_H = 96;

type SlideProps = { bottomPad: number };
type PlanId = 'hobby' | 'pro';

const HOBBY_UNLOCKS = [
  `${HOBBY_WEEKLY_SWIPES} swipes every week`,
  'Swipe left trash · right keep',
  'Dark & Light themes',
  '6 languages included',
  'Stats & streak sync when signed in',
  'Notifications & spin wheel bonuses',
  'On-device — your photos stay private',
];

const PRO_UNLOCKS = [
  'Unlimited swipes every day',
  'Supercut · Deep clean & batch delete',
  'Sticker studio (full unlock)',
  'Widgets (full unlock)',
  'Photobooth — filters, frames & stickers',
  'Duplicates finder — burst & junk stacks',
  'Full storage analytics & history',
  '4 premium colour themes',
  'Email clean — Gmail spam & promo batches',
  'Priority support · zero ads',
];

function SlidePage({ children }: { children: React.ReactNode }) {
  return <View style={ob.slidePage}>{children}</View>;
}

const PARTICLES = [
  { top: '14%', left: '18%', c: HOT, s: 3, d: 0, dur: 3.2 },
  { top: '24%', left: '76%', c: CYAN, s: 4, d: 400, dur: 2.8 },
  { top: '40%', left: '10%', c: GOLD, s: 3, d: 900, dur: 4 },
  { top: '32%', left: '86%', c: GREEN, s: 3, d: 200, dur: 3.5 },
  { top: '52%', left: '52%', c: PURPLE, s: 4, d: 700, dur: 3 },
] as const;

function FloatParticle({ top, left, color, size, delay, duration }: {
  top: string; left: string; color: string; size: number; delay: number; duration: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const yLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: 1, duration: duration * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: duration * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const oLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.15, duration: duration * 400, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: duration * 400, useNativeDriver: true }),
      ]),
    );
    yLoop.start();
    oLoop.start();
    return () => { yLoop.stop(); oLoop.stop(); };
  }, [delay, duration, op, y]);
  const ty = y.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        opacity: op,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

function WelcomeGlow() {
  const pulse = useRef(new Animated.Value(0.65)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0.55, 1], outputRange: [1, 1.18] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[ob.s1GlowOrb, { opacity: pulse, transform: [{ scale }] }]}
    />
  );
}

function CopyBlock({
  eyebrow,
  title,
  body,
  chip,
  bottomPad,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  chip?: string;
  bottomPad: number;
}) {
  return (
    <View style={[ob.copy, { paddingBottom: bottomPad }]}>
      <Text style={ob.eyebrow}>{eyebrow}</Text>
      {typeof title === 'string' ? <Text style={ob.bigTitle}>{title}</Text> : title}
      <Text style={ob.bodySm}>{body}</Text>
      {chip ? (
        <View style={ob.pillTag}>
          <Text style={ob.pillTxt}>{chip}</Text>
        </View>
      ) : null}
    </View>
  );
}

function OnboardSkipButton({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      onPress={onSkip}
      activeOpacity={0.75}
      style={[nav.skipTop, { top: Math.max(insets.top, 8) + 6 }]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={nav.skipTopTxt}>Skip</Text>
    </TouchableOpacity>
  );
}

function OnboardDots({ index }: { index: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[nav.dotsWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            nav.dot,
            i === index ? { width: 18, opacity: 1, backgroundColor: HOT } : { width: 6, opacity: 0.28 },
          ]}
        />
      ))}
    </View>
  );
}

function Slide1({ bottomPad }: SlideProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [floatY, spin, tilt]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ty = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const rock = tilt.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });

  return (
    <SlidePage>
      {PARTICLES.map((p, i) => (
        <FloatParticle key={i} top={p.top} left={p.l} color={p.c} size={p.s} delay={p.d} duration={p.dur} />
      ))}
      <View style={ob.slide1Body}>
        <View style={ob.slide1Top}>
          <View style={ob.heroStage}>
          <WelcomeGlow />
          <View style={ob.orbitWrap}>
            <Animated.View style={[ob.orbitRing, { transform: [{ rotate: rot }] }]}>
              <View style={[ob.orbitDot, ob.orbitDotTop, { backgroundColor: HOT }]} />
              <View style={[ob.orbitDot, ob.orbitDotBottom, { backgroundColor: CYAN }]} />
              <View style={[ob.orbitDot, ob.orbitDotLeft, { backgroundColor: GOLD }]} />
            </Animated.View>
            <Animated.View style={[ob.iconTile, { transform: [{ translateY: ty }, { rotate: rock }] }]}>
              <LinearGradient colors={[HOT, PURPLE]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Trash2 size={36} color="#fff" strokeWidth={2.2} />
            </Animated.View>
          </View>
        </View>
        </View>
        <CopyBlock
          bottomPad={bottomPad}
          eyebrow="WELCOME"
          title={
            <Text style={ob.bigTitle}>
              photo<Text style={{ color: HOT }}>dumps</Text>
            </Text>
          }
          body="Your camera roll deserves breathing room. Swipe through memories fast — trash the noise, keep what matters."
          chip="On-device · You stay in control"
        />
      </View>
    </SlidePage>
  );
}

function Slide2({ bottomPad }: SlideProps) {
  const swipe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(swipe, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(swipe, { toValue: 2, duration: 500, useNativeDriver: true }),
        Animated.timing(swipe, { toValue: 3, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(swipe, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [swipe]);

  const tx = swipe.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, -58, 0, 58] });
  const rot = swipe.interpolate({ inputRange: [0, 1, 2, 3], outputRange: ['0deg', '-10deg', '0deg', '10deg'] });
  const trashOp = swipe.interpolate({ inputRange: [0, 0.9, 1.3, 2], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const keepOp = swipe.interpolate({ inputRange: [0, 2, 2.8, 3.2], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const cardW = Math.min(172, width * 0.46);
  const arenaW = width - PAD * 2;

  return (
    <SlidePage>
      <View style={ob.slide2Body}>
        <View style={ob.slide2Top}>
          <View style={ob.cardClip}>
          <View style={[ob.cardArena, { width: arenaW, height: cardW * 1.35 + 24 }]}>
            <View style={[ob.demoCard, ob.dcBack, { width: cardW, height: cardW * 1.26, marginLeft: -cardW / 2 }]} />
            <View style={[ob.demoCard, ob.dcMid, { width: cardW, height: cardW * 1.26, marginLeft: -cardW / 2 }]} />
            <Animated.View
              style={[
                ob.demoCard,
                ob.dcFront,
                { width: cardW, height: cardW * 1.26, marginLeft: -cardW / 2, transform: [{ translateX: tx }, { rotate: rot }] },
              ]}
            >
              <Animated.View style={[ob.trashBadge, { opacity: trashOp }]}>
                <X size={10} color="#fff" strokeWidth={3} />
                <Text style={ob.badgeTxt}>TRASH</Text>
              </Animated.View>
              <Animated.View style={[ob.keepBadge, { opacity: keepOp }]}>
                <Check size={10} color="#000" strokeWidth={3} />
                <Text style={[ob.badgeTxt, { color: '#000' }]}>KEEP</Text>
              </Animated.View>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={ob.cardFooter}>
                <Text style={ob.cardDate}>MAR 12 · 2025</Text>
                <Text style={ob.cardMb}>4.1 MB</Text>
              </LinearGradient>
            </Animated.View>
          </View>
          <View style={ob.dirRow}>
            <View style={ob.dirCue}>
              <Text style={ob.dirArrow}>←</Text>
              <Text style={[ob.dirWord, { color: HOT }]}>TRASH</Text>
            </View>
            <View style={ob.dirCue}>
              <Text style={ob.dirArrow}>→</Text>
              <Text style={[ob.dirWord, { color: GREEN }]}>KEEP</Text>
            </View>
          </View>
        </View>
        </View>
        <CopyBlock
          bottomPad={bottomPad}
          eyebrow="THE FLOW"
          title="Swipe to decide"
          body="Left clears the clutter. Right keeps the shot. Nothing leaves until you confirm."
          chip="TRASH ←  ·  → KEEP"
        />
      </View>
    </SlidePage>
  );
}

function Slide3({ bottomPad }: SlideProps) {
  const [analysed, setAnalysed] = useState(false);
  const [scanning, setScanning] = useState(false);

  const onAnalyse = () => {
    if (scanning || analysed) return;
    setScanning(true);
    setTimeout(() => {
      setAnalysed(true);
      setScanning(false);
    }, 2600);
  };

  const alertLabel = analysed
    ? `${SC_TARGET_END.toLocaleString()} TARGETS LOCKED`
    : scanning
      ? 'SCANNING LIBRARY…'
      : '0 TARGETS · 0 GB — TAP TO PREVIEW';

  return (
    <SlidePage>
      <View style={ob.slide3Body}>
        <View style={ob.slide3Top}>
          <AlertStrip label={alertLabel} tone={analysed ? 'cyan' : 'hot'} />
          <LinearGradient colors={['#4B0082', '#8B1A6B', '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ob.supercutCardCompact}>
            <View style={ob.supercutRow}>
              <Zap size={16} color={GOLD} strokeWidth={2.5} />
              <Scan size={16} color={CYAN} strokeWidth={2.5} />
            </View>
            <Text style={ob.supercutTitleCompact}>SUPERCUT</Text>
            <View style={ob.scMetrics}>
              <View style={ob.scMetric}>
                {analysed ? (
                  <GlitchNumber value={SC_TARGET_END.toLocaleString()} size={20} color="#fff" />
                ) : scanning ? (
                  <CountUpText active to={SC_TARGET_END} duration={2600} style={ob.scMetricValCompact} />
                ) : (
                  <Text style={ob.scMetricValCompact}>0</Text>
                )}
                <Text style={ob.scMetricLbl}>targets</Text>
              </View>
              <View style={[ob.scMetric, ob.scMetricBorder]}>
                {analysed ? (
                  <GlitchNumber value="127" suffix="GB" size={20} color={GREEN} />
                ) : scanning ? (
                  <View style={ob.countRow}>
                    <CountUpText active to={SC_GB_END} duration={2600} style={[ob.scMetricValCompact, { color: GREEN }]} />
                    <Text style={ob.scMetricGb}> GB</Text>
                  </View>
                ) : (
                  <Text style={[ob.scMetricValCompact, { color: GREEN }]}>
                    0<Text style={ob.scMetricGb}> GB</Text>
                  </Text>
                )}
                <Text style={ob.scMetricLbl}>est. freed</Text>
              </View>
            </View>
          </LinearGradient>
          {!analysed && (
            <TouchableOpacity activeOpacity={0.9} onPress={onAnalyse} disabled={scanning}>
              <LinearGradient colors={['#2244e8', BLUE]} style={[ob.actionBtnCompact, scanning && ob.actionBtnDim]}>
                <Scan size={14} color="#fff" strokeWidth={2.5} />
                <Text style={ob.actionTxt}>{scanning ? 'SCANNING…' : 'TAP TO PREVIEW SCAN'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <CopyBlock
          bottomPad={bottomPad}
          eyebrow="PRO TOOLKIT"
          title="Supercut & deep scan"
          body="Batch scan flags screenshots, dupes, and burst stacks. One confirmed run clears hundreds in seconds."
          chip="Supercut · Duplicates · Deep clean"
        />
      </View>
    </SlidePage>
  );
}

function Slide4({ bottomPad }: SlideProps) {
  const beat = useRef(new Animated.Value(1)).current;
  const swipeGuide = useRef(new Animated.Value(0)).current;
  const [live, setLive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLive(true), 350);
    Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1.04, duration: 500, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(swipeGuide, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swipeGuide, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    return () => clearTimeout(t);
  }, [beat, swipeGuide]);
  const guideX = swipeGuide.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });

  return (
    <ScreenShake active>
      <SlidePage>
        <Scanlines opacity={0.1} />
        <View style={ob.slide4Body}>
          <View style={ob.slide4Top}>
            <AlertStrip label={live ? 'STORAGE ALERT — CRITICAL MASS' : 'SCANNING LIBRARY…'} tone="hot" />
            <Text style={ob.statsSection}>MY STATS</Text>
            <Animated.View style={[ob.statsHeroWrapCompact, { transform: [{ scale: beat }] }]}>
              <LinearGradient colors={['#3B0080', '#8B1A6B', '#FF3366']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ob.statsHeroCompact}>
                <Text style={ob.storageLabel}>STORAGE RECLAIMED</Text>
                <View style={ob.countRow}>
                  <CountUpText active={live} to={STATS_SESSION_GB} decimals={1} duration={2600} style={ob.storageBigCompact} />
                  <Text style={ob.storageBigSpanCompact}> GB</Text>
                </View>
                <Text style={ob.storageSub}>
                  <CountUpText active={live} to={STATS_ITEMS_SESSION} duration={2600} delay={200} style={ob.storageSubInline} />
                  {' deleted this session'}
                </Text>
                <View style={ob.storageDivider} />
                <View style={ob.countRow}>
                  <CountUpText active={live} to={STATS_ALLTIME_TB} decimals={1} duration={2800} delay={400} style={ob.storageAlltimeCompact} />
                  <Text style={ob.storageBigSpanCompact}> TB all time</Text>
                </View>
              </LinearGradient>
            </Animated.View>
            <LinearGradient colors={[BLUE, PURPLE]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={ob.pulseStripCompact}>
              <Scan size={12} color="#fff" strokeWidth={2.5} />
              <Text style={ob.pulseStripText} numberOfLines={1}>
                {STATS_FILES_PULSE.toLocaleString()} files · {STATS_SCREENSHOTS.toLocaleString()} screenshots
              </Text>
            </LinearGradient>
          </View>
          <CopyBlock
            bottomPad={bottomPad}
            eyebrow="YOUR PROGRESS"
            title="Stats that motivate"
            body="Track storage reclaimed, streaks, and library pulse — synced when you sign in."
            chip="Session + lifetime totals"
          />
          <Animated.View pointerEvents="none" style={[ob.supercutNextHint, { transform: [{ translateX: guideX }] }]}>
            <ChevronRight size={28} color="rgba(17,20,26,0.5)" strokeWidth={2.4} />
            <Text style={ob.supercutNextHintTxt}>SWIPE</Text>
          </Animated.View>
        </View>
      </SlidePage>
    </ScreenShake>
  );
}

function PlanCard({
  id,
  selected,
  onPress,
}: {
  id: PlanId;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.96)).current;
  const glow = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: selected ? 1.04 : 0.96, friction: 7, useNativeDriver: true }),
      Animated.timing(glow, { toValue: selected ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [glow, scale, selected]);

  const isPro = id === 'pro';
  const body = (
    <>
      <Text style={[ob.planTag, selected && ob.planTagOn]}>{isPro ? 'PRO' : 'HOBBY'}</Text>
      <Text style={ob.planVal}>{isPro ? '∞' : String(HOBBY_WEEKLY_SWIPES)}</Text>
      <Text style={[ob.planSub, selected && ob.planSubOn]}>{isPro ? 'unlimited swipes' : 'swipes / week'}</Text>
    </>
  );

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {isPro ? (
          <Animated.View style={{ opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }}>
            <LinearGradient
              colors={selected ? [HOT, PURPLE] : ['#2a1030', '#1a1028']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ob.planCard, selected && ob.planCardSelected]}
            >
              {body}
            </LinearGradient>
          </Animated.View>
        ) : (
          <View style={[ob.planCard, selected && ob.planCardSelected, selected && { borderColor: HOT }]}>
            {body}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function PlanFeaturePanel({ plan }: { plan: PlanId }) {
  const fade = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const prev = useRef(plan);

  useEffect(() => {
    if (prev.current === plan) return;
    prev.current = plan;
    fade.setValue(0);
    slideY.setValue(12);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fade, plan, slideY]);

  const items = plan === 'pro' ? PRO_UNLOCKS : HOBBY_UNLOCKS;
  const accent = plan === 'pro' ? PURPLE : HOT;

  return (
    <Animated.View style={[ob.featPanel, { opacity: fade, transform: [{ translateY: slideY }] }]}>
      <LinearGradient
        colors={[`${accent}33`, 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ob.featPanelBg}
      >
        <Text style={[ob.featPanelTitle, { color: accent }]}>
          {plan === 'pro' ? 'UNLOCKED WITH PRO' : 'INCLUDED ON HOBBY'}
        </Text>
        {items.map((line, i) => (
          <AnimatedFeatureRow key={`${plan}-${line}`} text={line} accent={accent} index={i} />
        ))}
      </LinearGradient>
    </Animated.View>
  );
}

function AnimatedFeatureRow({ text, accent, index }: { text: string; accent: string; index: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    op.setValue(0);
    tx.setValue(-16);
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 280, delay: index * 55, useNativeDriver: true }),
      Animated.spring(tx, { toValue: 0, friction: 8, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, [index, op, text, tx]);

  return (
    <Animated.View style={[ob.featItem, { opacity: op, transform: [{ translateX: tx }] }]}>
      <LinearGradient colors={[accent, `${accent}88`]} style={ob.featCheck}>
        <Check size={10} color="#fff" strokeWidth={3} />
      </LinearGradient>
      <Text style={ob.featText}>{text}</Text>
    </Animated.View>
  );
}

const SLIDES: ((p: SlideProps) => React.ReactNode)[] = [
  (p) => <Slide1 {...p} />,
  (p) => <Slide2 {...p} />,
  (p) => <Slide3 {...p} />,
  (p) => <Slide4 {...p} />,
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const lastIndexRef = useRef(0);
  const bottomPad = NAV_H;

  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  }, []);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(next);
    lastIndexRef.current = next;
  };

  const finish = async () => {
    await markOnboardingComplete();
    router.replace('/subscription?postOnboarding=1');
  };

  const skip = () => {
    if (index >= SLIDE_COUNT - 1) void finish();
    else goTo(SLIDE_COUNT - 1);
  };

  const onEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const vx = e.nativeEvent.velocity?.x ?? 0;
    if (lastIndexRef.current === SLIDE_COUNT - 1 && vx > 0.1) {
      void finish();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <OnboardSkipButton onSkip={skip} />
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          onScrollEndDrag={onEndDrag}
          decelerationRate="fast"
          bounces={false}
        >
          {SLIDES.map((Render, i) => (
            <View key={i} style={ob.slideOuter}>
              <Render bottomPad={i < SLIDE_COUNT - 1 ? bottomPad + 8 : 24} />
            </View>
          ))}
        </ScrollView>
        {index < SLIDE_COUNT - 1 && <OnboardDots index={index} />}
      </SafeAreaView>
    </View>
  );
}

const nav = StyleSheet.create({
  skipTop: {
    position: 'absolute',
    right: PAD,
    zIndex: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  skipTopTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(17,20,26,0.75)', letterSpacing: 0.3 },
  dotsWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 10,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  dot: { height: 4, borderRadius: 2, backgroundColor: '#12141A' },
  nextInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 16,
  },
  createTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  freeNote: { fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', marginTop: 8 },
});

const ob = StyleSheet.create({
  fill: { flex: 1, backgroundColor: BG },
  slidePage: { flex: 1, backgroundColor: BG, overflow: 'hidden', paddingTop: 44 },
  slideOuter: { width, flex: 1, backgroundColor: BG, overflow: 'hidden' },
  fullPage: {
    flex: 1,
    paddingHorizontal: PAD,
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 20,
  },
  slide1Body: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: PAD, gap: 10 },
  slide1Top: { flex: 1, justifyContent: 'center' },
  slide2Body: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: PAD, gap: 10 },
  slide2Top: { flex: 1, justifyContent: 'center' },
  slide3Body: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: PAD, gap: 10 },
  slide3Top: { height: '56%', justifyContent: 'flex-start', paddingTop: 8, gap: 10 },
  slide4Body: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: PAD, gap: 10 },
  slide4Top: { height: '56%', justifyContent: 'flex-start', paddingTop: 8, gap: 10 },
  slide5Body: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: PAD, gap: 10 },
  slide5Top: { justifyContent: 'flex-start', paddingTop: 8, gap: 10 },
  scanMainCompact: { alignItems: 'center', width: '100%', paddingVertical: 8 },
  zapHubCompact: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  zapTileCompact: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  statsHeroWrapCompact: { marginVertical: 4 },
  statsHeroCompact: { borderRadius: 18, padding: 16, overflow: 'hidden', alignItems: 'center', width: '100%' },
  storageBigCompact: { fontFamily: SYNE, fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  storageBigSpanCompact: { fontFamily: SYNE, fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  storageAlltimeCompact: { fontFamily: SYNE, fontSize: 26, fontWeight: '800', color: '#fff' },
  pulseStripCompact: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supercutCardCompact: { borderRadius: 16, padding: 14 },
  supercutTitleCompact: { fontFamily: SYNE, fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5, marginTop: 4 },
  scMetricValCompact: { fontFamily: SYNE, fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  actionBtnCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
  supercutNextHint: {
    position: 'absolute',
    right: 6,
    top: '48%',
    alignItems: 'center',
    opacity: 0.5,
  },
  supercutNextHintTxt: {
    marginTop: 2,
    fontSize: 8,
    letterSpacing: 1.6,
    fontWeight: '800',
    color: 'rgba(17,20,26,0.7)',
  },
  finalLogoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: HOT,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  finalLogo: { width: 88, height: 88 },
  cardClip: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD },
  dirRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 14, paddingHorizontal: 8 },
  dirCue: { alignItems: 'center' },
  centeredPage: {
    flex: 1,
    paddingHorizontal: PAD,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  supercutPage: {
    flex: 1,
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  supercutTop: { gap: 10, width: '100%' },
  supercutMid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 14,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  supercutBottom: { gap: 10, width: '100%', maxWidth: 400, alignSelf: 'center' },
  finalPage: { flex: 1, paddingHorizontal: PAD, paddingTop: 8 },
  heroStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  s1GlowOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,0,85,0.32)',
  },
  orbitWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  orbitDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  orbitDotTop: { top: -4, left: '50%', marginLeft: -4 },
  orbitDotBottom: { bottom: -4, left: '50%', marginLeft: -4 },
  orbitDotLeft: { left: -4, top: '50%', marginTop: -4 },
  scanMain: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  zapHub: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  statsHeroWrap: { flex: 1, justifyContent: 'center', marginVertical: 8 },
  heroRingHub: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  finalHero: { alignItems: 'center', justifyContent: 'center', height: 100, marginTop: 4 },
  finalOrbit: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  star: { position: 'absolute', borderRadius: 99, backgroundColor: '#fff', opacity: 0.45 },
  planRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4 },
  planCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planCardSelected: {
    shadowColor: HOT,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  planTag: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.45)' },
  planTagOn: { color: 'rgba(255,255,255,0.85)' },
  planVal: { fontFamily: SYNE, fontSize: 28, fontWeight: '800', color: '#12141A', marginTop: 4 },
  planSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  planSubOn: { color: 'rgba(255,255,255,0.75)' },
  featPanel: { marginTop: 12, marginBottom: 8 },
  featPanelBg: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featPanelTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 10 },
  copy: { paddingHorizontal: PAD },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 4, color: HOT, marginBottom: 8 },
  bigTitle: { fontFamily: SYNE, fontSize: 36, fontWeight: '800', color: '#12141A', lineHeight: 40, letterSpacing: -1, marginBottom: 10 },
  bodySm: { fontSize: 15, color: 'rgba(18,20,26,0.78)', lineHeight: 23 },
  pillTag: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(59,91,252,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,91,252,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillTxt: { fontSize: 12, color: 'rgba(17,20,26,0.8)', fontWeight: '600', letterSpacing: 0.3 },
  orbitRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
  },
  iconTile: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: HOT,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  cardArena: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  demoCard: { position: 'absolute', borderRadius: 20, left: '50%', overflow: 'hidden' },
  dcBack: { zIndex: 1, transform: [{ translateY: 12 }, { scale: 0.88 }], backgroundColor: '#1A0030' },
  dcMid: { zIndex: 2, transform: [{ translateY: 6 }, { scale: 0.94 }], backgroundColor: '#0A0020' },
  dcFront: { zIndex: 3, backgroundColor: '#5a0080' },
  trashBadge: {
    position: 'absolute',
    top: 10,
    left: 8,
    backgroundColor: HOT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    transform: [{ rotate: '-6deg' }],
  },
  keepBadge: {
    position: 'absolute',
    top: 10,
    right: 8,
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    transform: [{ rotate: '6deg' }],
  },
  badgeTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cardFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 52, padding: 10, justifyContent: 'flex-end' },
  cardDate: { color: 'rgba(255,255,255,0.48)', fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  cardMb: { color: GOLD, fontSize: 11, fontWeight: '900', marginTop: 2 },
  dirArrow: { fontSize: 16, fontWeight: '900', color: '#12141A', textAlign: 'center' },
  dirWord: { fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginTop: 2 },
  zapTile: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: GOLD,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  neonRow: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 0 },
  shockCaption: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: 'rgba(255,200,0,0.65)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statsSection: {
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(17,20,26,0.5)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  statsHero: { borderRadius: 20, padding: 20, overflow: 'hidden', alignItems: 'center', width: '100%' },
  storageLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: 'rgba(255,255,255,0.62)', marginBottom: 4 },
  storageSession: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  storageBig: { fontFamily: SYNE, fontSize: 56, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  storageBigSpan: { fontFamily: SYNE, fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.65)', marginBottom: 10 },
  storageAlltime: { fontFamily: SYNE, fontSize: 38, fontWeight: '800', color: '#fff' },
  storageSubInline: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  storageSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, textAlign: 'center', lineHeight: 16 },
  storageDivider: { height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 12 },
  pulseStrip: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseStripInner: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  pulseStripText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  miniStats: { flexDirection: 'row', gap: 10, marginTop: 10 },
  miniStatWide: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  miniStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  miniStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' },
  miniStatVal: { fontFamily: SYNE, fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  miniStatSub: { fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2 },
  scEyebrow: { fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.32)', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  supercutCard: { borderRadius: 20, padding: 16 },
  supercutRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  supercutTitle: { fontFamily: SYNE, fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  supercutBody: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 6, lineHeight: 20 },
  scMetrics: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  scMetric: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  scMetricBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  scMetricLbl: { fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, marginTop: 4, fontWeight: '700' },
  scMetricVal: { fontFamily: SYNE, fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  scMetricGb: { fontFamily: SYNE, fontSize: 14, fontWeight: '700', color: GREEN, marginBottom: 2 },
  analyseHintWrap: { alignItems: 'center', gap: 2, marginTop: 4 },
  analyseHintTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: CYAN },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  actionBtnDim: { opacity: 0.55 },
  runBtn: { shadowColor: HOT, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  actionTxt: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1.2 },
  legalTiny: { fontSize: 10, color: 'rgba(17,20,26,0.52)', textAlign: 'center', marginTop: 8 },
  readyLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 4, color: HOT, textAlign: 'center', marginTop: 4 },
  readyTitle: { fontFamily: SYNE, fontSize: 34, fontWeight: '800', color: '#12141A', textAlign: 'center', marginTop: 6 },
  readyBody: {
    fontSize: 14,
    color: 'rgba(17,20,26,0.75)',
    textAlign: 'center',
    paddingHorizontal: PAD + 8,
    lineHeight: 22,
    marginTop: 8,
  },
  featItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  featCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featText: { flex: 1, fontSize: 13, color: 'rgba(17,20,26,0.82)', lineHeight: 18 },
});
