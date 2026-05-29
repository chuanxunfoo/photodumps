import { Flame } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

export const STREAK_FIRE_THRESHOLD = 5;

type Props = {
  size?: number;
  color?: string;
  active: boolean;
  style?: ViewStyle;
};

/** Flickering flame — used when streak ≥ 5 days. */
export function StreakFire({ size = 18, color = '#FFFFFF', active, style }: Props) {
  const bob = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const flickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    bobLoop.start();
    flickerLoop.start();
    glowLoop.start();
    return () => {
      bobLoop.stop();
      flickerLoop.stop();
      glowLoop.stop();
    };
  }, [active, bob, flicker, glow]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const scale = flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  if (!active) {
    return (
      <View style={[styles.wrap, { width: size * 1.1, height: size * 1.2 }, style]}>
        <Flame size={size} color={color} strokeWidth={2.2} fill="rgba(255,255,255,0.15)" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size * 1.35, height: size * 1.45 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ghost, { transform: [{ translateY }, { scale: 0.72 }], opacity: 0.35 }]}
      >
        <Flame size={size * 0.85} color="#FF9A3C" fill="#FF5C00" strokeWidth={1.8} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Flame size={size} color={color} fill="#FFB347" strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  glow: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#FF8C00',
  },
  ghost: {
    position: 'absolute',
    bottom: 0,
  },
});
