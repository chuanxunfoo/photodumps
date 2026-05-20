/**
 * Standalone social-media promo landing — NOT part of in-app onboarding.
 * Open in Expo: navigate to /promo or npx expo start then visit /promo in dev menu.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  Camera,
  ChevronDown,
  Layers2,
  Scissors,
  Sparkles,
  Sticker,
  MoveHorizontal,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShimmerWord } from '../ShimmerWord';
import { SUPPORT_INSTAGRAM_USER } from '../../_lib/supportLinks';
import { BubbleField } from './BubbleField';
import { AQUA, PROMO_GRADIENTS } from './aquaTheme';

const { width: W, height: H } = Dimensions.get('window');
const PAGE_H = H;
const LOGO = require('../../assets/brand/photodumps-logo.png');
const RISE = Easing.bezier(0.22, 1, 0.36, 1);

type SlideProps = {
  children: React.ReactNode;
  index: number;
  scrollY: Animated.Value;
  style?: ViewStyle;
};

function PromoSlide({ children, index, scrollY, style }: SlideProps) {
  const input = [(index - 1) * PAGE_H, index * PAGE_H, (index + 1) * PAGE_H];
  const opacity = scrollY.interpolate({
    inputRange: input,
    outputRange: [0.25, 1, 0.25],
    extrapolate: 'clamp',
  });
  const translateY = scrollY.interpolate({
    inputRange: input,
    outputRange: [36, 0, -36],
    extrapolate: 'clamp',
  });
  const scale = scrollY.interpolate({
    inputRange: input,
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        st.slide,
        style,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tag?: string;
}) {
  return (
    <LinearGradient colors={[...PROMO_GRADIENTS.card]} style={st.card}>
      {tag ? (
        <View style={st.cardTag}>
          <Text style={st.cardTagTxt}>{tag}</Text>
        </View>
      ) : null}
      <View style={st.cardIcon}>{icon}</View>
      <Text style={st.cardTitle}>{title}</Text>
      <Text style={st.cardBody}>{body}</Text>
    </LinearGradient>
  );
}

function CausticLight() {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View pointerEvents="none" style={[st.caustic, { transform: [{ rotate: spin }] }]}>
      <LinearGradient
        colors={['rgba(45,212,191,0.2)', 'transparent', 'rgba(125,211,252,0.15)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

const PAGES = 8;

export default function PromoLanding() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const heroPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [heroPulse]);

  const glowScale = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const glowOp = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / PAGE_H);
    if (idx !== page && idx >= 0 && idx < PAGES) setPage(idx);
  };

  const openIg = () => {
    void Linking.openURL(`https://instagram.com/${SUPPORT_INSTAGRAM_USER}`);
  };

  return (
    <View style={st.root}>
      <LinearGradient colors={[...PROMO_GRADIENTS.hero]} style={StyleSheet.absoluteFill} />
      <CausticLight />
      <BubbleField count={16} />

      <Animated.ScrollView
        ref={scrollRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={PAGE_H}
        snapToAlignment="start"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: onScroll,
        })}
        scrollEventThrottle={16}
      >
        {/* 1 — Hero */}
        <PromoSlide index={0} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <View style={st.heroCenter}>
              <Animated.View style={[st.logoGlow, { opacity: glowOp, transform: [{ scale: glowScale }] }]} />
              <View style={st.logoBox}>
                <Image source={LOGO} style={st.logoImg} contentFit="cover" />
              </View>
              <ShimmerWord style={st.brand}>{'photodumps'}</ShimmerWord>
              <Text style={st.heroTag}>dump what's perfect.{'\n'}keep what's real.</Text>
              <View style={st.pillRow}>
                <Text style={st.pill}>photo cleaner</Text>
                <Text style={st.pill}>creative tools</Text>
              </View>
            </View>
            <View style={st.scrollCue}>
              <Text style={st.cueLbl}>SWIPE UP</Text>
              <ChevronDown size={18} color={AQUA.mist} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </SafeAreaView>
        </PromoSlide>

        {/* 2 — Swipe */}
        <PromoSlide index={1} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>01 · CORE</Text>
            <Text style={st.headline}>Swipe your{'\n'}camera roll clean</Text>
            <Text style={st.lead}>
              One gesture to keep the memories that matter. One gesture to queue the rest. Fast, tactile, oddly satisfying.
            </Text>
            <FeatureCard
              tag="FREE"
              icon={<MoveHorizontal size={28} color={AQUA.foam} />}
              title="Swipe to keep or dump"
              body="Review photos at your own pace — bookmarks, streaks, and a spin wheel when your week needs a boost."
            />
          </SafeAreaView>
        </PromoSlide>

        {/* 3 — Sticker Studio */}
        <PromoSlide index={2} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>02 · CREATE</Text>
            <Text style={st.headline}>Sticker studio</Text>
            <Text style={st.lead}>
              Point your camera at any object. AI cuts it out, you pick chalk, glow, or toon outlines — then collage it.
            </Text>
            <FeatureCard
              tag="PRO"
              icon={<Sticker size={28} color={AQUA.foam} />}
              title="AI cutouts & collages"
              body="Live scan, tap-to-focus, cute frames, and a gallery of stickers you actually made."
            />
          </SafeAreaView>
        </PromoSlide>

        {/* 4 — Photobooth */}
        <PromoSlide index={3} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>03 · VIBES</Text>
            <Text style={st.headline}>Digi photobooth</Text>
            <Text style={st.lead}>
              Y2K camera bodies, date stamps, and strip energy — shoot, preview, save straight to your gallery.
            </Text>
            <FeatureCard
              tag="PRO"
              icon={<Camera size={28} color={AQUA.foam} />}
              title="Digital camera mood"
              body="Pick a body, dial the look, capture moments that feel like a night out — not a spreadsheet."
            />
          </SafeAreaView>
        </PromoSlide>

        {/* 5 — Supercut */}
        <PromoSlide index={4} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>04 · POWER</Text>
            <Text style={st.headline}>Supercut</Text>
            <Text style={st.lead}>
              Batch-clean stacks of similar shots with AI-assisted picks — less scrolling, more breathing room on your phone.
            </Text>
            <FeatureCard
              tag="PRO"
              icon={<Zap size={28} color={AQUA.foam} />}
              title="AI batch cleaning"
              body="Queue a set, review the keepers, dump the noise — built for camera-roll chaos."
            />
          </SafeAreaView>
        </PromoSlide>

        {/* 6 — Tools */}
        <PromoSlide index={5} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>05 · TOOLKIT</Text>
            <Text style={st.headline}>Smart extras</Text>
            <Text style={st.lead}>Pro unlocks the sharp edges — duplicates, trims, and stats that respect your time.</Text>
            <View style={st.cardGrid}>
              <View style={st.miniCard}>
                <Layers2 size={22} color={AQUA.glow} />
                <Text style={st.miniTitle}>Duplicates</Text>
                <Text style={st.miniSub}>Burst stacks, swipe once</Text>
              </View>
              <View style={st.miniCard}>
                <Scissors size={22} color={AQUA.glow} />
                <Text style={st.miniTitle}>Video trim</Text>
                <Text style={st.miniSub}>CapCut-style export</Text>
              </View>
              <View style={st.miniCard}>
                <BarChart2 size={22} color={AQUA.glow} />
                <Text style={st.miniTitle}>My stats</Text>
                <Text style={st.miniSub}>Cleanup insights</Text>
              </View>
            </View>
          </SafeAreaView>
        </PromoSlide>

        {/* 7 — Pro */}
        <PromoSlide index={6} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <Text style={st.kicker}>06 · PRO</Text>
            <Text style={st.headline}>Go unlimited</Text>
            <Text style={st.lead}>
              Six signature themes, extra app icons, languages, notifications — and every Pro tool above the waterline.
            </Text>
            <View style={st.proList}>
              {['Unlimited swipes', 'Sticker studio & photobooth', 'Supercut + duplicates', 'Y2K · Cyber · Noir themes'].map(
                line => (
                  <View key={line} style={st.proRow}>
                    <Sparkles size={14} color={AQUA.glow} />
                    <Text style={st.proTxt}>{line}</Text>
                  </View>
                ),
              )}
            </View>
          </SafeAreaView>
        </PromoSlide>

        {/* 8 — CTA */}
        <PromoSlide index={7} scrollY={scrollY}>
          <SafeAreaView style={st.slideInner} edges={['top', 'bottom']}>
            <View style={st.ctaCenter}>
              <Text style={st.kicker}>DIVE IN</Text>
              <Text style={st.headline}>Get photodumps</Text>
              <Text style={st.lead}>
                Free on iOS & Android. Follow for drops, tips, and new features — we build in public.
              </Text>
              <TouchableOpacity style={st.ctaBtn} activeOpacity={0.9} onPress={openIg}>
                <LinearGradient
                  colors={[AQUA.lagoon, AQUA.glow]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={st.ctaGrad}
                >
                  <Text style={st.ctaTxt}>@{SUPPORT_INSTAGRAM_USER}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={st.storeHint}>Search “photodumps” on the App Store & Google Play</Text>
              <Text style={st.sig}>made with love · EGN</Text>
            </View>
          </SafeAreaView>
        </PromoSlide>
      </Animated.ScrollView>

      <View style={[st.dots, { top: insets.top + 12 }]} pointerEvents="none">
        {Array.from({ length: PAGES }).map((_, i) => (
          <View key={i} style={[st.dot, i === page && st.dotOn]} />
        ))}
      </View>

      <View style={[st.pageNum, { bottom: insets.bottom + 16 }]} pointerEvents="none">
        <Text style={st.pageNumTxt}>
          {String(page + 1).padStart(2, '0')} / {String(PAGES).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: AQUA.abyss },
  slide: {
    width: W,
    height: PAGE_H,
    justifyContent: 'center',
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
    justifyContent: 'center',
  },
  caustic: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: AQUA.glow,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(165,243,252,0.45)',
    marginBottom: 24,
  },
  logoImg: { width: 96, height: 96 },
  brand: {
    fontSize: Math.min(48, W * 0.12),
    fontWeight: '900',
    letterSpacing: -1.5,
    color: AQUA.sky,
  },
  heroTag: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 26,
    color: AQUA.pearl,
    textAlign: 'center',
    opacity: 0.88,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: AQUA.deep,
    backgroundColor: AQUA.foam,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scrollCue: { alignItems: 'center', paddingBottom: 8 },
  cueLbl: { fontSize: 10, letterSpacing: 2.5, color: AQUA.ink, fontWeight: '700', marginBottom: 4 },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: AQUA.glow,
    marginBottom: 12,
  },
  headline: {
    fontSize: Math.min(40, W * 0.1),
    fontWeight: '900',
    color: AQUA.pearl,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 14,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    color: AQUA.ink,
    marginBottom: 22,
    maxWidth: 340,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.25)',
  },
  cardTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45,212,191,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTagTxt: { fontSize: 10, fontWeight: '800', color: AQUA.foam, letterSpacing: 1 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(2,24,36,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: AQUA.pearl, marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 21, color: AQUA.ink },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniCard: {
    width: (W - 56 - 20) / 3,
    minWidth: 96,
    backgroundColor: 'rgba(4,48,72,0.55)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.2)',
    gap: 6,
  },
  miniTitle: { fontSize: 12, fontWeight: '800', color: AQUA.pearl },
  miniSub: { fontSize: 10, color: AQUA.ink, lineHeight: 14 },
  proList: { gap: 12, marginTop: 4 },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  proTxt: { fontSize: 15, color: AQUA.pearl, fontWeight: '600' },
  ctaCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ctaBtn: { width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ctaGrad: { paddingVertical: 16, alignItems: 'center' },
  ctaTxt: { fontSize: 17, fontWeight: '800', color: AQUA.deep },
  storeHint: { marginTop: 16, fontSize: 13, color: AQUA.ink, textAlign: 'center' },
  sig: {
    marginTop: 28,
    fontSize: 14,
    color: 'rgba(165,243,252,0.35)',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'cursive', default: 'cursive' }),
  },
  dots: {
    position: 'absolute',
    right: 14,
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(125,211,252,0.25)',
  },
  dotOn: {
    height: 18,
    backgroundColor: AQUA.glow,
  },
  pageNum: {
    position: 'absolute',
    left: 20,
    alignItems: 'flex-start',
  },
  pageNumTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(125,211,252,0.45)',
  },
});
