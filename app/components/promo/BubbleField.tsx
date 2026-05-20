import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { AQUA } from './aquaTheme';

const { width: W, height: H } = Dimensions.get('window');

type BubbleSpec = {
  x: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

function makeBubbles(count: number): BubbleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    x: (W * (0.08 + (i * 0.11) % 0.84)) + (i % 3) * 12,
    size: 6 + (i % 5) * 8,
    delay: (i * 340) % 2400,
    duration: 4200 + (i % 4) * 900,
    opacity: 0.12 + (i % 4) * 0.08,
  }));
}

export function BubbleField({ count = 14 }: { count?: number }) {
  const specs = useMemo(() => makeBubbles(count), [count]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {specs.map((b, i) => (
        <Bubble key={i} spec={b} />
      ))}
    </View>
  );
}

function Bubble({ spec }: { spec: BubbleSpec }) {
  const y = useRef(new Animated.Value(H + spec.size)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(y, {
          toValue: -spec.size * 2,
          duration: spec.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(y, { toValue: H + spec.size, duration: 0, useNativeDriver: true }),
      ]),
    );
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 1800 + spec.size * 40, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0, duration: 1800 + spec.size * 40, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    rise.start();
    sway.start();
    return () => {
      rise.stop();
      sway.stop();
    };
  }, [spec, wobble, y]);

  const tx = wobble.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });

  return (
    <Animated.View
      style={[
        st.bubble,
        {
          left: spec.x,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          opacity: spec.opacity,
          backgroundColor: AQUA.foam,
          transform: [{ translateY: y }, { translateX: tx }],
        },
      ]}
    />
  );
}

const st = StyleSheet.create({
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(165,243,252,0.35)',
  },
});
