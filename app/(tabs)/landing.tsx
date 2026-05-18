/**
 * photodumps landing — dark full-screen, no tab bar
 */
import { ShimmerWord } from '../components/ShimmerWord';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BLUE = '#5B7FFF';
const SPARK = '#00D68F';
const RISE = Easing.bezier(0.22, 1, 0.36, 1);
const LOGO = 100;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_SRC = require('../assets/brand/photodumps-logo.png');

function FloatingOrb({ size, top, left, right, duration, delay }: {
  size: number; top?: number; left?: number; right?: number; duration: number; delay: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: 1, duration: duration * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: duration * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, y]);
  const ty = y.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(59,91,252,0.12)',
        top,
        left,
        right,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

export default function LandingScreen() {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(24)).current;
  const restOp = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.5)).current;
  const hintY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp, { toValue: 1, duration: 900, easing: RISE, useNativeDriver: true }),
      Animated.timing(logoY, { toValue: 0, duration: 900, easing: RISE, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
    ]).start();
    setTimeout(() => Animated.timing(restOp, { toValue: 1, duration: 700, useNativeDriver: true }).start(), 350);

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.45, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glowLoop.start();

    const hintLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintY, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hintY, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    hintLoop.start();

    return () => {
      glowLoop.stop();
      hintLoop.stop();
    };
  }, []);

  const glowScale = glow.interpolate({ inputRange: [0.45, 1], outputRange: [1, 1.12] });
  const arrowTy = hintY.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  const goOnboarding = () => router.replace('/onboarding');

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#0c1028', '#06060e', '#020204']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(59,91,252,0.14)', 'transparent', 'rgba(0,214,143,0.06)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <FloatingOrb size={260} top={-70} left={-50} duration={7} delay={0} />
      <FloatingOrb size={180} bottom={100} right={-30} duration={5} delay={800} />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <TouchableOpacity style={s.tapArea} activeOpacity={1} onPress={goOnboarding}>
          <View style={s.hero}>
            <Animated.View
              style={[s.logoWrap, { opacity: logoOp, transform: [{ translateY: logoY }, { scale: logoScale }] }]}
            >
              <Animated.View style={[s.logoGlow, { opacity: glow, transform: [{ scale: glowScale }] }]} />
              <View style={s.logoBox}>
                <Image source={LOGO_SRC} style={s.logoImg} contentFit="cover" />
              </View>
            </Animated.View>

            <ShimmerWord
              style={{
                fontSize: Math.min(52, width * 0.13),
                letterSpacing: -1.5,
                color: BLUE,
              }}
            >
              photodumps
            </ShimmerWord>

            <Animated.Text style={[s.slogan, { opacity: restOp }]}>
              dump what's perfect.{'\n'}keep what's real.
            </Animated.Text>

            <Animated.View style={{ opacity: restOp }}>
              <LinearGradient colors={[BLUE, SPARK]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.divider} />
            </Animated.View>
          </View>

          <Animated.View style={[s.scrollHint, { opacity: restOp, transform: [{ translateY: arrowTy }] }]}>
            <Text style={s.scrollLabel}>SEE THE APP</Text>
            <View style={s.scrollArrow} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View style={[s.sig, { opacity: restOp }]} pointerEvents="none">
          <Text style={s.sigLove}>made with love</Text>
          <Text style={s.sigName}>EGN</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030308' },
  safe: { flex: 1 },
  tapArea: { flex: 1, justifyContent: 'space-between' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: { marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
  logoGlow: {
    position: 'absolute',
    width: LOGO + 36,
    height: LOGO + 36,
    borderRadius: (LOGO + 36) / 2,
    backgroundColor: 'rgba(59,91,252,0.35)',
  },
  logoBox: {
    width: LOGO,
    height: LOGO,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#3B5BFC',
  },
  logoImg: { width: LOGO, height: LOGO, borderRadius: 26 },
  slogan: {
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(200,210,255,0.55)',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.2,
    maxWidth: 280,
  },
  divider: { width: 44, height: 2, borderRadius: 2, marginTop: 20 },
  scrollHint: { alignItems: 'center', paddingBottom: 28 },
  scrollLabel: { fontSize: 11, color: 'rgba(180,195,255,0.4)', letterSpacing: 2.5, fontWeight: '600' },
  scrollArrow: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(180,195,255,0.35)',
    transform: [{ rotate: '45deg' }],
    marginTop: 10,
  },
  sig: { alignItems: 'center', paddingBottom: 8 },
  sigLove: {
    fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'cursive', default: 'cursive' }),
    fontSize: 16,
    color: 'rgba(180,195,255,0.28)',
    fontStyle: 'italic',
  },
  sigName: {
    fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'cursive', default: 'cursive' }),
    fontSize: 13,
    color: 'rgba(180,195,255,0.16)',
    marginTop: 2,
  },
});
