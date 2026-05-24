import { Hand } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BUTTER = '#F5D547';

type Props = {
  size?: number;
  active?: boolean;
};

/** Looping tap hint — ripple + hand press, no text. */
export function TapGuidePulse({ size = 120, active = true }: Props) {
  const ripple = useRef(new Animated.Value(0)).current;
  const hand = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ripple.setValue(0);
      hand.setValue(0);
      glow.setValue(0);
      return;
    }
    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ripple, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const handLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hand, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(hand, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(380),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    rippleLoop.start();
    handLoop.start();
    glowLoop.start();
    return () => {
      rippleLoop.stop();
      handLoop.stop();
      glowLoop.stop();
    };
  }, [active, glow, hand, ripple]);

  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.35] });
  const rippleOp = ripple.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.75, 0.45, 0] });
  const handY = hand.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const handScale = hand.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });
  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });

  if (!active) return null;

  return (
    <View style={[st.wrap, { width: size, height: size }]} pointerEvents="none">
      <Animated.View
        style={[
          st.ripple,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: rippleOp,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />
      <Animated.View style={[st.glow, { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.28, opacity: glowOp }]} />
      <Animated.View style={{ transform: [{ translateY: handY }, { scale: handScale }] }}>
        <View style={st.handBubble}>
          <Hand size={28} color="#fff" strokeWidth={2.2} />
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ripple: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: BUTTER,
  },
  glow: {
    position: 'absolute',
    backgroundColor: BUTTER,
  },
  handBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: 'rgba(245,213,71,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BUTTER,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
});
