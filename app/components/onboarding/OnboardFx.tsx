import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

export const PAD = 24;
export const HOT = '#FF0055';
export const PURPLE = '#8A2BE2';
export const GOLD = '#FFD600';
export const CYAN = '#00E5FF';
export const GREEN = '#00D68F';
export const BLUE = '#3B5BFC';

export function Scanlines({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={[fx.scanlines, { opacity }]}>
      {Array.from({ length: 28 }).map((_, i) => (
        <View key={i} style={fx.scanline} />
      ))}
    </View>
  );
}

export function GridBg() {
  return (
    <View pointerEvents="none" style={fx.grid}>
      <View style={fx.gridRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={`v${i}`} style={fx.gridLineV} />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(59,91,252,0.12)', 'transparent', 'rgba(255,0,85,0.08)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
}

export function AlertStrip({ label, tone = 'hot' }: { label: string; tone?: 'hot' | 'gold' | 'cyan' }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.35, duration: 420, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    ).start();
  }, [blink]);
  const bg = tone === 'gold' ? GOLD : tone === 'cyan' ? CYAN : HOT;
  return (
    <Animated.View style={[fx.alertStrip, { backgroundColor: bg, opacity: blink }]}>
      <Text style={fx.alertTxt}>{label}</Text>
    </Animated.View>
  );
}

export function GlitchNumber({
  value,
  suffix,
  size = 48,
  color = '#fff',
  style,
}: {
  value: string;
  suffix?: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  const jolt = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(jolt, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(jolt, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(2200),
      ]),
    ).start();
  }, [jolt]);
  const dx = jolt.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const base: TextStyle = { fontSize: size, fontWeight: '900', letterSpacing: -2, ...style };

  const dxCyan = jolt.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const dxHot = jolt.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  return (
    <View style={fx.glitchWrap}>
      <Animated.Text style={[base, fx.glitchGhost, { color: CYAN, opacity: 0.55, transform: [{ translateX: dxCyan }] }]}>
        {value}
      </Animated.Text>
      <Animated.Text style={[base, fx.glitchGhost, { color: HOT, opacity: 0.45, transform: [{ translateX: dxHot }] }]}>
        {value}
      </Animated.Text>
      <Text style={[base, { color }]}>
        {value}
        {suffix ? <Text style={{ fontSize: size * 0.45, fontWeight: '700', color: 'rgba(255,255,255,0.65)' }}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

/** Expanding ring centered in its parent (use inside a sized hub view). */
export function ShockRing({ color, size = 120 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ).start();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.8] });
  const op = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: op,
        transform: [{ scale }],
      }}
    />
  );
}

export function PulseBorder({ children, style, colors = [HOT, GOLD, HOT] as const }: {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, string];
}) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(p, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    ).start();
  }, [p]);
  const borderColor = p.interpolate({ inputRange: [0, 1], outputRange: [colors[0], colors[1]] });
  return (
    <Animated.View style={[fx.pulseCard, style, { borderColor }]}>
      {children}
    </Animated.View>
  );
}

export function ScreenShake({ children, active }: { children: React.ReactNode; active?: boolean }) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
        Animated.delay(1800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, shake]);
  const tx = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 4] });
  return <Animated.View style={{ flex: 1, transform: [{ translateX: tx }] }}>{children}</Animated.View>;
}

export function NeonStatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [scale]);
  return (
    <Animated.View style={[fx.neonCard, { borderColor: accent, transform: [{ scale }] }]}>
      <LinearGradient colors={[`${accent}22`, 'transparent']} style={StyleSheet.absoluteFill} />
      <Text style={[fx.neonVal, { color: accent }]}>{value}</Text>
      <Text style={fx.neonLbl}>{label}</Text>
    </Animated.View>
  );
}

const fx = StyleSheet.create({
  scanlines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanline: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  gridRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-evenly' },
  gridLineV: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', height: '100%' },
  glitchGhost: { position: 'absolute' },
  alertStrip: { marginHorizontal: PAD, marginTop: 8, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  alertTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 3, color: '#000' },
  glitchWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseCard: { borderWidth: 2, borderRadius: 18, overflow: 'hidden' },
  neonCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  neonVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  neonLbl: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
});
