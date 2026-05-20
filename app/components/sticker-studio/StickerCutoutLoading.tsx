import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Sparkles, Star } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { CutoutPipeline } from '../../_lib/stickerStudio/cutoutProgress';
import { STUDIO } from './stickerStudioUi';

type Props = {
  pct: number;
  stage: string;
  pipeline: CutoutPipeline;
};

export function StickerCutoutLoading({ pct, stage }: Props) {
  const bob = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const safePct = Math.min(100, Math.max(0, pct));

  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    b.start();
    p.start();
    return () => { b.stop(); p.stop(); };
  }, [bob, pulse]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={st.wrap}>
      <LinearGradient colors={[...STUDIO.bg]} style={StyleSheet.absoluteFill} />

      <Animated.View style={{ opacity: glow, position: 'absolute', top: '22%', left: '18%' }}>
        <Star size={16} color="#FFD54F" fill="#FFD54F" />
      </Animated.View>
      <Animated.View style={{ opacity: glow, position: 'absolute', top: '28%', right: '20%' }}>
        <Heart size={14} color="#FF8EC7" fill="#FF8EC7" />
      </Animated.View>

      <Animated.View style={[st.card, { transform: [{ translateY }] }]}>
        <LinearGradient colors={['#FF6B9D', '#BF5AF2']} style={st.orb}>
          <Sparkles size={28} color="#fff" />
        </LinearGradient>
        <Text style={st.title}>Making your sticker…</Text>
        <Text style={st.stage} numberOfLines={2}>
          {stage || 'Tracing the edges'}
        </Text>
        <View style={st.track}>
          <View style={[st.fill, { width: `${Math.max(8, safePct)}%` }]} />
        </View>
        <Text style={st.pct}>{safePct}%</Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  stage: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', backgroundColor: '#FF8EC7', borderRadius: 3 },
  pct: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700' },
});
