import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShimmerWord } from './ShimmerWord';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_LOGO = require('../assets/brand-icon.png');

const WORD = 'photodumps';
const LETTER_MS = 68;
const BEAM_CYCLE_MS = 3800;

type Props = { onDone: () => void };

function AnimatedLetter({
  char,
  index,
  fontFamily,
  onLastLand,
}: {
  char: string;
  index: number;
  fontFamily: string;
  onLastLand?: () => void;
}) {
  const y = useRef(new Animated.Value(-52)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 520 + index * LETTER_MS;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(y, {
          toValue: 0,
          friction: 7,
          tension: 68,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && index === WORD.length - 1) onLastLand?.();
      });
    }, delay);
    return () => clearTimeout(t);
  }, [index, onLastLand, op, y]);

  return (
    <Animated.Text
      style={{
        fontFamily,
        fontSize: 32,
        fontWeight: '900',
        color: '#12141A',
        letterSpacing: -1.2,
        opacity: op,
        transform: [{ translateY: y }],
      }}
    >
      {char}
    </Animated.Text>
  );
}

const titleFont = Platform.select({
  ios: 'System',
  android: 'sans-serif-black',
  default: undefined,
});
const bodyFont = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: undefined,
});
const accentFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export function SplashScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [lettersDone, setLettersDone] = useState(false);

  const logoScale = useRef(new Animated.Value(0.42)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const ruleW = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(14)).current;
  const tagOp = useRef(new Animated.Value(0)).current;
  const footOp = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const startTagline = useCallback(() => {
    Animated.parallel([
      Animated.timing(tagOp, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(tagY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
    Animated.timing(footOp, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
  }, [footOp, tagOp, tagY]);

  const onLastLetter = useCallback(() => {
    setLettersDone(true);
    Animated.timing(ruleW, {
      toValue: 1,
      duration: 640,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) startTagline();
    });
  }, [ruleW, startTagline]);

  useEffect(() => {

    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 72, useNativeDriver: true }),
      Animated.timing(logoOp, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(beam, {
        toValue: 1,
        duration: BEAM_CYCLE_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ).start();

    const exit = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 480, useNativeDriver: true }).start(() => onDone());
    }, 5400);

    return () => clearTimeout(exit);
  }, [beam, fadeOut, logoOp, logoScale, onDone]);

  const beamX = beam.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const ruleScaleX = ruleW.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] });

  return (
    <Animated.View style={[styles.root, { opacity: fadeOut, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoScale }] }}>
          <View style={styles.logoClip}>
            <Image source={SPLASH_LOGO} style={styles.logo} contentFit="cover" />
            <Animated.View
              pointerEvents="none"
              style={[styles.beamWrap, { transform: [{ translateX: beamX }, { rotate: '-32deg' }] }]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.beam}
              />
            </Animated.View>
          </View>
        </Animated.View>

        <View style={styles.titleBlock}>
          {lettersDone ? (
            <ShimmerWord
              sweepMs={1200}
              idleMs={3200}
              style={{
                fontSize: 32,
                letterSpacing: -1.2,
                color: '#12141A',
                fontFamily: titleFont,
                fontWeight: '900',
              }}
            >
              {WORD}
            </ShimmerWord>
          ) : (
            <View style={styles.wordRow}>
              {WORD.split('').map((ch, i) => (
                <AnimatedLetter
                  key={`${ch}-${i}`}
                  char={ch}
                  index={i}
                  fontFamily={titleFont}
                  onLastLand={i === WORD.length - 1 ? onLastLetter : undefined}
                />
              ))}
            </View>
          )}
        </View>

        <Animated.View
          style={[
            styles.rule,
            { transform: [{ scaleX: ruleScaleX }] },
          ]}
        />

        <Animated.Text
          style={[
            styles.tagline,
            { fontFamily: bodyFont, opacity: tagOp, transform: [{ translateY: tagY }] },
          ]}
        >
          CLEAN YOUR CAMERA ROLL
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, { opacity: footOp, paddingBottom: insets.bottom }]}>
        <Text style={[styles.love, { fontFamily: accentFont }]}>
          made with love
        </Text>
        <Text style={[styles.msm, { fontFamily: bodyFont }]}>MSM.CO</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoClip: {
    width: 108,
    height: 108,
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 8,
  },
  logo: { width: 108, height: 108 },
  beamWrap: {
    position: 'absolute',
    top: -20,
    left: -40,
    width: 60,
    height: 148,
  },
  beam: { flex: 1, width: 60 },
  titleBlock: {
    marginTop: 28,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rule: {
    width: 200,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(17,17,17,0.22)',
    marginTop: 16,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.2,
    color: 'rgba(17,17,17,0.42)',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  love: {
    fontSize: 17,
    fontStyle: 'italic',
    color: 'rgba(17,17,17,0.38)',
    letterSpacing: 0.6,
  },
  msm: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 6,
    color: 'rgba(17,17,17,0.55)',
  },
});
