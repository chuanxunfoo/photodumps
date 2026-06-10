import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Hammer } from 'lucide-react-native';
import { MinimalForwardChevron } from '../MinimalBackButton';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { ThemeColors } from '../../(tabs)/ThemeContext';
import {
  LANGUAGES, LanguageId, FREE_THEMES, THEMES_MAP, THEME_META, THEME_PICKER_IDS, ThemeId, resolveTypeface, useTheme,
} from '../../(tabs)/ThemeContext';
import { getLocaleUi } from '../../_lib/localeUi';
import { SUPPORTED_LANGUAGE_IDS } from '../../_lib/i18n/supported';
import { textOnAccent, textOnHex } from '../../_lib/themeContrast';
import {
  CALENDAR_SLOT,
  calendarGradient,
  contrastOnGradient,
  hubBarGradientColors,
  hubBarSpec,
} from './hubBarThemes';

const { width, height } = Dimensions.get('window');

/** Horizontal showcase width â€” slightly narrow so the next card peeks in (carousel reads less â€œlonelyâ€). */
export const PRO_LOOK_CARD_W = Math.min(width * 0.68, 264);
export const PRO_LOOK_SNAP = PRO_LOOK_CARD_W + 14;

export type BannerVibe = 'minimal' | 'cyber' | 'muji' | 'zen' | 'y2k' | 'dark';

const BANNER_PALETTES: Record<BannerVibe, [string, string][]> = {
  minimal: [
    ['#FF4D8D', '#FF8A5C'], ['#3B82F6', '#60A5FA'], ['#8B5CF6', '#C084FC'], ['#06B6D4', '#22D3EE'],
    ['#F59E0B', '#FBBF24'], ['#10B981', '#34D399'], ['#EC4899', '#F472B6'], ['#6366F1', '#818CF8'],
    ['#0EA5E9', '#38BDF8'], ['#EF4444', '#FCA5A5'], ['#84CC16', '#A3E635'], ['#F97316', '#FDBA74'],
    ['#14B8A6', '#5EEAD4'], ['#D946EF', '#F0ABFC'], ['#A855F7', '#E879F9'], ['#0D9488', '#2DD4BF'],
  ],
  dark: [
    ['#FF0055', '#FF5500'], ['#6366F1', '#A855F7'], ['#0EA5E9', '#06B6D4'], ['#E11D48', '#FB7185'],
    ['#F59E0B', '#F97316'], ['#10B981', '#34D399'], ['#C026D3', '#EC4899'], ['#3B82F6', '#60A5FA'],
    ['#14B8A6', '#22C55E'], ['#F43F5E', '#FDA4AF'], ['#8B5CF6', '#C4B5FD'], ['#38BDF8', '#2563EB'],
    ['#FBBF24', '#FDE047'], ['#4ADE80', '#059669'], ['#F472B6', '#DB2777'], ['#818CF8', '#4F46E5'],
  ],
  cyber: [
    ['#FF00AA', '#7000FF'], ['#00F0FF', '#0066FF'], ['#FF0055', '#FFCC00'], ['#BD00FF', '#FF6B9D'],
    ['#00FF9C', '#00B8FF'], ['#FF6B00', '#FF0055'], ['#00E5FF', '#7C3AED'], ['#FF1493', '#00CED1'],
    ['#39FF14', '#00F5FF'], ['#FF4FD8', '#9333EA'], ['#00FFA3', '#FF00AA'], ['#FBBF24', '#FF0055'],
    ['#22D3EE', '#FF00CC'], ['#00FFC6', '#FF2BA6'], ['#FF5500', '#FFD600'], ['#C77DFF', '#00E5FF'],
  ],
  muji: [
    ['#5C4033', '#8B6914'], ['#6F4E37', '#A67C52'], ['#4A6741', '#6B8F71'], ['#8B4513', '#C9A227'],
    ['#B5523B', '#D4897A'], ['#3E3228', '#6B5538'], ['#7A6340', '#B8956A'], ['#5A4A38', '#947050'],
    ['#6B5B4A', '#9A8468'], ['#4A5D4A', '#7A9E7E'], ['#C4654A', '#8B4513'], ['#8B7355', '#D4C4B0'],
    ['#5C4033', '#C9A227'], ['#6B8F71', '#4A6741'], ['#947050', '#D4A574'],
  ],
  zen: [
    ['#5C6B5A', '#8FA898'], ['#6B7B6B', '#A8B5A0'], ['#4A6741', '#7A9E7E'], ['#8B7355', '#C0A878'],
    ['#5C7A8A', '#98B8C8'], ['#6B6558', '#A89888'], ['#5A7268', '#88B0A0'], ['#7A6B58', '#B8A090'],
    ['#4A6B5C', '#7A9A8C'], ['#8A7A68', '#C4B4A4'], ['#5C6858', '#90A888'], ['#6B7B6B', '#B0C0B0'],
    ['#4A5D52', '#809890'], ['#9A8468', '#D8C8B0'], ['#5A7A6A', '#9AC8B8'],
  ],
  y2k: [
    ['#FF2BA6', '#FF6EC7'], ['#00F5FF', '#7BF0FF'], ['#FFE066', '#FF9E00'], ['#FF00CC', '#8338EC'],
    ['#00FFC6', '#5EEAD4'], ['#FF48B0', '#FFB0E8'], ['#8338EC', '#C77DFF'], ['#FF1493', '#00CED1'],
    ['#39FF14', '#00F5D4'], ['#FF6EC7', '#B8F0FF'], ['#FFD600', '#FF6B9D'], ['#00E5FF', '#FF00AA'],
    ['#FF58B8', '#98D0F8'], ['#FF0055', '#00FFF0'], ['#C77DFF', '#7BF0FF'],
  ],
};

export function exploreBannerVibe(themeId: ThemeId, _isDark: boolean): BannerVibe {
  switch (themeId) {
    case 'cyberpunk': return 'cyber';
    case 'vintage': return 'muji';
    case 'zen': return 'zen';
    case 'y2k': return 'y2k';
    case 'dark': return 'dark';
    default: return 'minimal';
  }
}

export function tickerTextColorForTheme(themeId: ThemeId): string {
  return themeId === 'light' ? '#111111' : 'rgba(255,255,255,0.98)';
}

export function tickerHuesForTheme(themeId: ThemeId, theme: ThemeColors): [string, string, string] {
  switch (themeId) {
    case 'cyberpunk': return ['#FF00AA', '#00F0FF', '#7000FF'];
    case 'vintage': return ['#5C4033', '#8B6914', '#6B8F71'];
    case 'zen': return ['#5C6B5A', '#8B7355', '#4A6741'];
    case 'y2k': return ['#FF6EC7', '#7BF0FF', '#FFE066'];
    case 'dark': return ['#FF0055', '#6366F1', '#0EA5E9'];
    case 'light': return ['#2563EB', '#F59E0B', '#10B981'];
    default: return ['#FF0055', '#2563EB', '#7C3AED'];
  }
}

/** @deprecated Use subscribeGradientForTheme — kept for type compat. */
export const SUBSCRIBE_BANNER_GRADIENT: [string, string] = ['#C4A882', '#8B6F47'];

/** Pro subscribe accent — follows active theme (no candy-floss orange). */
export function subscribeGradientForTheme(themeId: ThemeId, _theme: ThemeColors): [string, string] {
  return hubBarGradientColors(hubBarSpec(themeId, 0));
}

/** Month list row on calendar tab — unique slot per row. */
export function monthRowGradient(themeId: ThemeId, monthIndex: number): [string, string] {
  return calendarGradient(themeId, monthIndex);
}

/** Time capsule strip on calendar. */
export function calendarBannerGradient(themeId: ThemeId, _theme: ThemeColors): [string, string] {
  return calendarGradient(themeId, CALENDAR_SLOT.capsule);
}

export { calendarDeepCleanGradient } from './hubBarThemes';

function buildDedupedGradientPool(vibe: BannerVibe): [string, string][] {
  const seen = new Set<string>();
  const pool: [string, string][] = [];
  const order: BannerVibe[] = [vibe, 'minimal', 'dark', 'cyber', 'muji', 'zen', 'y2k'];
  for (const v of order) {
    for (const pair of BANNER_PALETTES[v]) {
      const key = `${pair[0]}|${pair[1]}`;
      if (seen.has(key)) continue;
      if (key === `${SUBSCRIBE_BANNER_GRADIENT[0]}|${SUBSCRIBE_BANNER_GRADIENT[1]}`) continue;
      if (key === '#FFD700|#FF8C00') continue;
      seen.add(key);
      pool.push(pair);
    }
  }
  return pool;
}

export function assignUniqueBannerGradients(vibe: BannerVibe, slots: number[]): Map<number, [string, string]> {
  const pool = buildDedupedGradientPool(vibe);
  const map = new Map<number, [string, string]>();
  const used = new Set<string>();
  let pi = 0;
  for (const slot of slots) {
    for (let attempt = 0; attempt < pool.length + 2; attempt++) {
      const pair = pool[pi % pool.length];
      pi += 1;
      const key = `${pair[0]}|${pair[1]}`;
      if (used.has(key)) continue;
      used.add(key);
      map.set(slot, pair);
      break;
    }
  }
  return map;
}

export function tickerChrome(theme: ThemeColors, vibe: BannerVibe): { bg: string; fg: string } {
  if (vibe === 'y2k') return { bg: theme.accent, fg: textOnAccent(theme) };
  if (vibe === 'cyber') return { bg: theme.bg3, fg: theme.accent };
  if (vibe === 'muji') return { bg: theme.accent, fg: textOnAccent(theme) };
  if (vibe === 'zen') return { bg: theme.accent2, fg: textOnHex(theme.accent2) };
  if (vibe === 'dark') return { bg: theme.bg3, fg: theme.text };
  return { bg: theme.bg2, fg: theme.text };
}

export function ThemePreviewTile({ id, selected }: { id: ThemeId; selected: boolean }) {
  const T = THEMES_MAP[id];
  const meta = THEME_META[id];
  const f = resolveTypeface(T);
  return (
    <View
      style={{
        width: 58,
        height: 78,
        borderRadius: T.radiusMd,
        backgroundColor: T.bg2,
        borderWidth: selected ? 2 : T.borderW,
        borderColor: selected ? T.accent : T.border,
        overflow: 'hidden',
        padding: 6,
      }}
    >
      <View style={{ height: 7, borderRadius: 2, backgroundColor: T.accent, marginBottom: 4 }} />
      <Text numberOfLines={1} style={{ fontSize: 7, fontWeight: '900', color: T.text, fontFamily: f.titleFont }}>
        {meta.label.split(' ')[0]}
      </Text>
      <View style={{ flex: 1, marginTop: 4, borderRadius: 4, backgroundColor: T.card, borderWidth: StyleSheet.hairlineWidth, borderColor: T.border, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 8, color: T.textMuted }}>â—‡</Text>
      </View>
    </View>
  );
}

export function ThemeShowcaseCard({ id, active, cardWidth = PRO_LOOK_CARD_W }: { id: ThemeId; active: boolean; cardWidth?: number }) {
  const T = THEMES_MAP[id];
  const meta = THEME_META[id];
  const f = resolveTypeface(T);
  return (
    <View
      style={{
        width: cardWidth,
        borderRadius: T.radiusLg,
        borderWidth: active ? 2.5 : T.borderW,
        borderColor: active ? T.accent : T.border,
        paddingVertical: 18,
        paddingHorizontal: 16,
        backgroundColor: T.bg2,
        minHeight: 168,
        shadowColor: id === 'y2k' ? '#000' : 'transparent',
        shadowOffset: id === 'y2k' ? { width: 4, height: 4 } : { width: 0, height: 0 },
        shadowOpacity: id === 'y2k' ? 0.45 : 0,
        elevation: id === 'y2k' ? 6 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 2, color: T.accent }}>PHOTODUMPS</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: T.card, borderWidth: StyleSheet.hairlineWidth, borderColor: T.border }}>
          <Text style={{ fontSize: 8, fontWeight: '800', color: T.textSub }}>12/80</Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 21,
          fontWeight: '900',
          color: T.text,
          fontFamily: f.titleFont,
          fontStyle: id === 'vintage' ? 'italic' : 'normal',
          letterSpacing: id === 'zen' ? 2 : id === 'y2k' ? 0.5 : 0.2,
        }}
      >
        {meta.label}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 18, color: T.textSub, fontWeight: '600', fontFamily: f.bodyFont }}>
        {meta.pitch}
      </Text>
      <Text style={{ marginTop: 10, fontSize: 11, lineHeight: 15, color: T.textMuted, fontWeight: '500', fontStyle: id === 'vintage' ? 'italic' : 'normal' }}>
        {meta.mood}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 14, gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: T.accent2 }} />
        <View style={{ width: 44, height: 22, borderRadius: id === 'y2k' ? 14 : T.radiusSm, backgroundColor: T.accentSoft, borderWidth: T.borderW, borderColor: T.border, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: T.accent }}>KEEP</Text>
        </View>
      </View>
    </View>
  );
}

import { GlassTicker } from '../GlassTicker';

/** Glassy colour-shifting ticker — shared across hub & calendar. */
export function Ticker({ text, bg: _bg, color: _color, speed = 10000, height: h = 32 }: {
  text: string; bg: string; color: string; speed?: number; height?: number;
}) {
  const { theme, themeId } = useTheme();
  const hues = tickerHuesForTheme(themeId, theme);
  return (
    <GlassTicker
      text={text}
      speed={speed}
      height={h}
      hues={hues}
      textColor={tickerTextColorForTheme(themeId)}
      blurTint={theme.isDark ? 'dark' : 'light'}
    />
  );
}

/** Hub row — each slot gets a unique solid or gradient bar with high-contrast labels. */
export function HubNavRow({
  theme,
  themeId,
  slot,
  fonts,
  title,
  subtitle,
  icon,
  onPress,
  proLock,
  italic,
  compact,
  comingSoon,
}: {
  theme: ThemeColors;
  themeId: ThemeId;
  slot: number;
  fonts: ReturnType<typeof resolveTypeface>;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  proLock?: boolean;
  italic?: boolean;
  compact?: boolean;
  /** Frosted overlay, hammer badge, no navigation. */
  comingSoon?: boolean;
}) {
  const bar = hubBarSpec(themeId, slot);
  const grad = hubBarGradientColors(bar);
  /** Consistent hub row typography — white on gradient bars (no per-slot black/white flip). */
  const titleColor = '#FFFFFF';
  const subtitleColor = 'rgba(255,255,255,0.9)';
  const iconColor = '#FFFFFF';
  const chevronColor = 'rgba(255,255,255,0.88)';
  const iconBg = 'rgba(0,0,0,0.28)';
  const borderColor = 'rgba(255,255,255,0.32)';
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!proLock) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [proLock, pulse]);

  const inner = (
    <>
      {proLock && (
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#FFD700',
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }),
          }}
        />
      )}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: theme.radiusMd,
          backgroundColor: iconBg,
          borderWidth: 1,
          borderColor: borderColor,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0, zIndex: 2 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 16,
            fontWeight: '900',
            color: titleColor,
            fontFamily: fonts.titleFont,
            fontStyle: 'normal',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={{
              marginTop: 3,
              fontSize: 12,
              fontWeight: '700',
              color: subtitleColor,
              fontFamily: fonts.bodyFont,
              lineHeight: 16,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {comingSoon ? (
        <View style={{ width: 22 }} />
      ) : proLock ? (
        <LinearGradient
          colors={['#FFD700', '#FF8C00']}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Crown size={11} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>PRO</Text>
        </LinearGradient>
      ) : (
        <MinimalForwardChevron color={chevronColor} />
      )}
    </>
  );

  const shellBase = {
    borderRadius: theme.radiusLg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    overflow: 'hidden' as const,
  };

  const isZen = themeId === 'zen';
  const isY2k = themeId === 'y2k';
  const shell = {
    ...shellBase,
    borderWidth: isY2k ? 3 : isZen ? 2.5 : 1,
    borderColor: isY2k ? '#1A1028' : bar.borderColor,
    ...(isY2k
      ? {
          shadowColor: grad[0],
          shadowOffset: { width: 5, height: 5 },
          shadowOpacity: 0.45,
          shadowRadius: 0,
          elevation: 8,
        }
      : {}),
  };

  const fadeTop = theme.isDark ? 'rgba(12,14,22,0.52)' : 'rgba(255,255,255,0.58)';
  const fadeBottom = theme.isDark ? 'rgba(12,14,22,0.72)' : 'rgba(255,255,255,0.78)';

  const gradientBar = (
    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={shell}>
      {inner}
      {comingSoon ? (
        <View style={hubSoon.overlay} pointerEvents="none">
          <LinearGradient
            colors={[fadeTop, fadeBottom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[hubSoon.hammerBadge, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.92)', borderColor: theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)' }]}>
            <Hammer size={18} color={theme.isDark ? '#FFD54F' : '#B8860B'} strokeWidth={2.4} />
          </View>
          <View style={[hubSoon.soonPill, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.94)', borderColor: theme.isDark ? 'rgba(255,255,255,0.2)' : theme.border }]}>
            <Text style={[hubSoon.soonTxt, { color: theme.isDark ? '#FFF' : theme.text, fontFamily: fonts.bodyFont }]}>Coming soon</Text>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );

  return (
    <Pressable
      onPress={comingSoon ? undefined : onPress}
      disabled={comingSoon}
      onPressIn={comingSoon ? undefined : () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={comingSoon ? undefined : () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      style={({ pressed }) => [{ marginBottom: compact ? 0 : 10, opacity: comingSoon ? 1 : pressed ? 0.92 : 1 }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {isZen ? (
          <View
            style={{
              borderRadius: theme.radiusLg,
              backgroundColor: bar.shadowColor ?? 'rgba(0,0,0,0.14)',
              paddingBottom: 5,
              paddingRight: 5,
            }}
          >
            <View style={{ marginTop: -5, marginLeft: -5 }}>{gradientBar}</View>
          </View>
        ) : (
          gradientBar
        )}
      </Animated.View>
    </Pressable>
  );
}

// ——— GLOW BANNER — calendar page only; typography follows active theme
export function GlowBanner({
  slot,
  vibe,
  theme,
  fonts,
  title,
  subtitle,
  colors,
  icon,
  onPress,
  proLock,
  italic,
  subscribeShimmer,
}: {
  slot: number;
  vibe: BannerVibe;
  theme: ThemeColors;
  fonts: ReturnType<typeof resolveTypeface>;
  title: string;
  subtitle?: string;
  colors?: [string, string];
  icon: React.ReactNode;
  onPress: () => void;
  proLock?: boolean;
  italic?: boolean;
  subscribeShimmer?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!subscribeShimmer) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [subscribeShimmer, shimmer]);
  useEffect(() => {
    if (!proLock) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [proLock, pulse]);

  const pair = colors ?? buildDedupedGradientPool(vibe)[slot % buildDedupedGradientPool(vibe).length];
  const tone = contrastOnGradient(pair);
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
  const titleStyle = {
    fontSize: 18,
    fontWeight: '900' as const,
    color: tone.titleColor,
    fontFamily: fonts.titleFont,
    fontStyle: (italic ? 'italic' : 'normal') as 'italic' | 'normal',
    letterSpacing: 0.5,
    textTransform: 'none',
  };

  const rimLight = theme.isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.38)';
  const iconWell = theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.28)';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      style={({ pressed }) => [{ marginBottom: 14, opacity: pressed ? 0.92 : 1 }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={pair}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            borderRadius: 20,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: rimLight,
          }}
        >
          {subscribeShimmer && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: width * 0.45,
                transform: [{ translateX: shimmerX }],
              }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
          {proLock && (
            <Animated.View
              pointerEvents="none"
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: '#FFD700',
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
              }}
            />
          )}
          <View style={{
            width: 44, height: 44, borderRadius: 14, backgroundColor: iconWell,
            justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: rimLight,
          }}
          >
            {icon}
          </View>
          <View style={{ flex: 1, minWidth: 0, zIndex: 2 }}>
            <Text style={titleStyle} numberOfLines={2}>{title}</Text>
            {subtitle ? (
              <Text
                numberOfLines={2}
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: '700',
                  fontFamily: fonts.bodyFont,
                  color: tone.subtitleColor,
                  lineHeight: 15,
                  letterSpacing: 0.2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {proLock ? (
            <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Crown size={11} color="#FFF" />
              <Text style={{ color: '#1A1000', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>PRO</Text>
            </LinearGradient>
          ) : (
            <MinimalForwardChevron />
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// â”€â”€â”€ THEME PICKER MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ThemeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, themeId, setThemeId, isPro, openSubscription } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={[exploreModalStyles.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }]}>
          <View style={[exploreModalStyles.handle, { backgroundColor: theme.border }]} />
          <Text style={[exploreModalStyles.title, { color: theme.text }]}>APP THEME</Text>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            {THEME_PICKER_IDS.map((id) => {
              const meta = THEME_META[id];
              const isFree = FREE_THEMES.includes(id);
              const locked = !isPro && !isFree;
              const selected = themeId === id;

              return (
                <TouchableOpacity
                  key={id}
                  style={[exploreModalStyles.themeRow, {
                    backgroundColor: selected ? theme.accentSoft : theme.bg2,
                    borderColor: selected ? theme.accent : theme.border,
                    borderWidth: theme.borderW + (selected ? 0.5 : 0),
                  }]}
                  onPress={() => {
                    if (locked) { openSubscription(); return; }
                    setThemeId(id); onClose();
                  }}
                >
                  <ThemePreviewTile id={id} selected={selected} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>
                      {meta.emoji} {meta.label}
                    </Text>
                    <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', lineHeight: 16 }}>{meta.pitch}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '500', fontStyle: 'italic' }}>{meta.mood}</Text>
                    {!isFree && (
                      <Text style={{ color: theme.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 }}>PRO LOOK</Text>
                    )}
                  </View>
                  {locked ? (
                    <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Crown size={10} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>PRO</Text>
                    </LinearGradient>
                  ) : selected ? (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.success, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: textOnHex(theme.success), fontSize: 13, fontWeight: '900' }}>✓</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[exploreModalStyles.closeBtn, { backgroundColor: theme.bg3, margin: 16 }]} onPress={onClose}>
            <Text style={[exploreModalStyles.closeTxt, { color: theme.text }]}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ LANGUAGE MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, language, setLanguage } = useTheme();
  const u = getLocaleUi(language);
  const slideAnim = useRef(new Animated.Value(height)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, useNativeDriver: true }).start();
  }, [visible]);

  const pick = (id: LanguageId) => {
    void setLanguage(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={[exploreModalStyles.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }]}>
          <View style={[exploreModalStyles.handle, { backgroundColor: theme.border }]} />
          <Text style={[exploreModalStyles.title, { color: theme.text }]}>{u.langModalTitle}</Text>
          <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8, lineHeight: 17 }}>
            {u.langModalHint}
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            {(SUPPORTED_LANGUAGE_IDS as unknown as LanguageId[]).map((id) => (
              <TouchableOpacity key={id} style={[exploreModalStyles.langRow, { backgroundColor: theme.bg2, borderColor: language === id ? theme.accent : theme.border }]} onPress={() => pick(id)}>
                <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: '700' }}>{LANGUAGES[id]}</Text>
                {language === id ? (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: textOnAccent(theme), fontSize: 10, fontWeight: '900' }}>✓</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[exploreModalStyles.closeBtn, { backgroundColor: theme.bg3, margin: 16 }]} onPress={onClose}>
            <Text style={[exploreModalStyles.closeTxt, { color: theme.text }]}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const hubSoon = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hammerBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-14deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  soonPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  soonTxt: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export const exploreModalStyles = StyleSheet.create({
  sheet: { maxHeight: height * 0.88, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 3, textAlign: 'center', paddingVertical: 14 },
  themeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 10, borderRadius: 18, borderWidth: 1.5 },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 6, borderRadius: 16, borderWidth: 1.5 },
  closeBtn: { borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  closeTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
