import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AtSign, BarChart2, Bell, BookmarkIcon, Camera, CircleDot, Crown, Globe,
  HelpCircle, Palette, Settings, FileText, Star, Zap, Scissors, Layers2, Sticker,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, ImageBackground, Linking, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubscriptionModal } from './SubscriptionModal';
import { AppHeader } from '../components/AppHeader';
import { exploreChildParams } from '../_lib/exploreBack';
import { getExploreCopy } from '../_lib/localeContent';
import type { ThemeColors } from './ThemeContext';
import { LANGUAGES, LanguageId, PREMIUM_THEMES, FREE_THEMES, THEMES_MAP, THEME_META, THEME_PICKER_IDS, ThemeId, resolveTypeface, useTheme } from './ThemeContext';

const EUGENE_PAPER = require('../assets/explore/eugene-paper.png');
const PALM_KL = require('../assets/explore/palm-kl.png');

const { width, height } = Dimensions.get('window');

/** Horizontal showcase width — slightly narrow so the next card peeks in (carousel reads less “lonely”). */
const PRO_LOOK_CARD_W = Math.min(width * 0.68, 264);
const PRO_LOOK_SNAP = PRO_LOOK_CARD_W + 14;

type BannerVibe = 'neon' | 'y2k' | 'jewel' | 'slate' | 'mono';

const BANNER_PALETTES: Record<BannerVibe, [string, string][]> = {
  neon: [
    ['#FF0055', '#FF8C00'], ['#00F0FF', '#00FF9C'], ['#C084FC', '#6366F1'], ['#FBBF24', '#F97316'],
    ['#22D3EE', '#2563EB'], ['#FB7185', '#DB2777'], ['#A3E635', '#22C55E'], ['#F472B6', '#9333EA'],
    ['#38BDF8', '#0EA5E9'], ['#FACC15', '#EA580C'], ['#4ADE80', '#059669'], ['#E879F9', '#EC4899'],
    ['#2DD4BF', '#0891B2'], ['#FCA5A5', '#DC2626'], ['#93C5FD', '#4F46E5'], ['#FF00AA', '#7000FF'],
  ],
  y2k: [
    ['#FF2BA6', '#C77DFF'], ['#FF00FF', '#00FFC6'], ['#FF1493', '#00CED1'], ['#FF69B4', '#9370DB'],
    ['#FF10F0', '#39FF14'], ['#FF5EEA', '#00E5FF'], ['#FF4FD8', '#9D4EDD'], ['#FF006E', '#8338EC'],
    ['#FF2E88', '#00F5D4'], ['#FF00CC', '#3333FF'], ['#FF6EC7', '#00D4AA'], ['#FF4FAB', '#4361EE'],
    ['#FF2D92', '#7209B7'], ['#FF0F7B', '#00B4D8'], ['#FF00A0', '#AD00FF'], ['#FF5ACD', '#00FFF0'],
  ],
  jewel: [
    ['#1e3a5f', '#312e81'], ['#14532d', '#166534'], ['#7c2d12', '#c2410c'], ['#581c87', '#7e22ce'],
    ['#134e4a', '#0f766e'], ['#831843', '#be185d'], ['#4c0519', '#9f1239'], ['#164e63', '#155e75'],
    ['#1c1917', '#44403c'], ['#3730a3', '#5b21b6'], ['#0c4a6e', '#0369a1'], ['#3f6212', '#4d7c0f'],
    ['#713f12', '#a16207'], ['#4a044e', '#86198f'], ['#0f172a', '#334155'], ['#292524', '#57534e'],
  ],
  /** Zen / minimal — ink-wash, mist, sage, porcelain (not flat black–navy) */
  slate: [
    ['#94a3b8', '#475569'], ['#a8b8c8', '#64748b'], ['#d6d3d1', '#57534e'], ['#86efac', '#166534'],
    ['#7dd3fc', '#0369a1'], ['#fbcfe8', '#be185d'], ['#fde68a', '#b45309'], ['#c4b5fd', '#6d28d9'],
    ['#99f6e4', '#0f766e'], ['#fecaca', '#b91c1c'], ['#e7e5e4', '#44403c'], ['#bae6fd', '#075985'],
    ['#fcd34d', '#92400e'], ['#d8b4fe', '#7e22ce'], ['#f5f5f4', '#78716c'], ['#a7f3d0', '#047857'],
  ],
  mono: [
    ['#000000', '#262626'], ['#FFD600', '#000000'], ['#000000', '#FFD600'], ['#111111', '#444444'],
    ['#FFD600', '#111111'], ['#000000', '#FFE600'], ['#1a1a1a', '#FFD600'], ['#000000', '#888888'],
    ['#FFD600', '#333333'], ['#050505', '#FFD600'], ['#000000', '#CCCCCC'], ['#FFD600', '#666666'],
    ['#222222', '#FFD600'], ['#000000', '#AAAA00'], ['#FFD600', '#222222'], ['#111111', '#FFD600'],
  ],
};

function exploreBannerVibe(themeId: ThemeId, isDark: boolean): BannerVibe {
  if (!isDark) {
    if (themeId === 'brutalist') return 'mono';
    if (themeId === 'zen') return 'slate';
    return 'jewel';
  }
  if (themeId === 'y2k') return 'y2k';
  return 'neon';
}

/** Subscribe bar only — no other banner reuses this pair. */
export const SUBSCRIBE_BANNER_GRADIENT: [string, string] = ['#FFB800', '#FF4500'];

function buildDedupedGradientPool(vibe: BannerVibe): [string, string][] {
  const seen = new Set<string>();
  const pool: [string, string][] = [];
  const order: BannerVibe[] = [vibe, 'neon', 'y2k', 'jewel', 'slate', 'mono'];
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

function assignUniqueBannerGradients(vibe: BannerVibe, slots: number[]): Map<number, [string, string]> {
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

function tickerChrome(theme: ThemeColors, vibe: BannerVibe): { bg: string; fg: string } {
  if (vibe === 'mono') return { bg: '#000000', fg: '#FFD600' };
  if (vibe === 'slate') return { bg: '#475569', fg: '#f8fafc' };
  if (!theme.isDark) return { bg: '#1e293b', fg: '#F1F5F9' };
  return { bg: theme.accent, fg: '#FFFFFF' };
}

function ThemePreviewTile({ id, selected }: { id: ThemeId; selected: boolean }) {
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
        <Text style={{ fontSize: 8, color: T.textMuted }}>◇</Text>
      </View>
    </View>
  );
}

function ThemeShowcaseCard({ id, active, cardWidth = PRO_LOOK_CARD_W }: { id: ThemeId; active: boolean; cardWidth?: number }) {
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
          letterSpacing: id === 'zen' ? 3 : id === 'brutalist' ? 1 : 0.2,
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
        <View style={{ width: 44, height: 22, borderRadius: id === 'brutalist' ? 0 : 10, backgroundColor: T.accentSoft, borderWidth: T.borderW, borderColor: T.border, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: T.accent }}>KEEP</Text>
        </View>
      </View>
    </View>
  );
}

// ─── LED TICKER ──────────────────────────────────────────────────────
function Ticker({ text, bg, color, speed = 10000, height: h = 28 }: {
  text: string; bg: string; color: string; speed?: number; height?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = () => {
      anim.setValue(0);
      Animated.timing(anim, { toValue: -width, duration: speed, easing: Easing.linear, useNativeDriver: true }).start(() => run());
    };
    run();
  }, []);
  const full = `${text}   •   ${text}   •   ${text}   •   `;
  return (
    <View style={{ height: h, backgroundColor: bg, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: anim }] }}>
        {[0, 1, 2, 3].map(i => (
          <Text key={i} style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>{full}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── GLOW BANNER — typography follows active theme; colours follow vibe (dark = neon, light = deep jewel, etc.)
function GlowBanner({
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
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
  const glowTint = theme.isDark ? '#FFFFFF' : '#FFFFFF';
  const haloRadius = theme.isDark ? 14 : 11;

  const titleStyle = {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#FFF',
    fontFamily: fonts.titleFont,
    fontStyle: (italic ? 'italic' : 'normal') as 'italic' | 'normal',
    letterSpacing: 0.5,
    textTransform: 'none',
    textShadowColor: glowTint,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: haloRadius,
  };

  const rimLight = theme.isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.38)';
  const iconWell = theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.28)';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      style={{ marginBottom: 14 }}
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
          <View style={{ flex: 1 }}>
            <Text style={titleStyle}>{title}</Text>
            {subtitle ? (
              <Text style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: '700',
                fontFamily: fonts.bodyFont,
                color: 'rgba(255,255,255,0.9)',
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
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>PRO</Text>
            </LinearGradient>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 22, fontWeight: '300' }}>›</Text>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── THEME PICKER MODAL ──────────────────────────────────────────────
function ThemeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, themeId, setThemeId, isPro, openSubscription } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={[sh.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }]}>
          <View style={[sh.handle, { backgroundColor: theme.border }]} />
          <Text style={[sh.title, { color: theme.text }]}>APP THEME</Text>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            {THEME_PICKER_IDS.map((id) => {
              const meta = THEME_META[id];
              const isFree = FREE_THEMES.includes(id);
              const locked = !isPro && !isFree;
              const selected = themeId === id;

              return (
                <TouchableOpacity
                  key={id}
                  style={[sh.themeRow, {
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
                      <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>✓</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[sh.closeBtn, { backgroundColor: theme.bg3, margin: 16 }]} onPress={onClose}>
            <Text style={[sh.closeTxt, { color: theme.text }]}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── LANGUAGE MODAL ──────────────────────────────────────────────────
function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, language, setLanguage, isPro, openSubscription } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, useNativeDriver: true }).start();
  }, [visible]);

  const allIds = Object.keys(LANGUAGES) as LanguageId[];
  const freeIds: LanguageId[] = ['en'];
  const proOnly = allIds.filter(id => !freeIds.includes(id));

  const pick = (id: LanguageId) => {
    if (freeIds.includes(id)) {
      void setLanguage(id);
      onClose();
      return;
    }
    if (!isPro) {
      openSubscription();
      return;
    }
    void setLanguage(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={[sh.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }]}>
          <View style={[sh.handle, { backgroundColor: theme.border }]} />
          <Text style={[sh.title, { color: theme.text }]}>LANGUAGES</Text>
          <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8, lineHeight: 17 }}>
            English is included on Hobby. Every other language unlocks with Pro.
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            <Text style={{ color: theme.textSub, fontSize: 9, fontWeight: '900', letterSpacing: 3, marginBottom: 10 }}>INCLUDED</Text>
            {freeIds.map(id => (
              <TouchableOpacity key={id} style={[sh.langRow, { backgroundColor: theme.bg2, borderColor: language === id ? theme.accent : theme.border }]} onPress={() => pick(id)}>
                <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: '700' }}>{LANGUAGES[id]}</Text>
                {language === id && <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
              </TouchableOpacity>
            ))}
            <Text style={{ color: theme.textSub, fontSize: 9, fontWeight: '900', letterSpacing: 3, marginTop: 18, marginBottom: 10 }}>PRO LANGUAGES</Text>
            {proOnly.map(id => {
              const locked = !isPro;
              return (
                <TouchableOpacity
                  key={id}
                  style={[sh.langRow, { backgroundColor: theme.bg2, borderColor: language === id ? theme.accent : theme.border, opacity: locked ? 0.92 : 1 }]}
                  onPress={() => pick(id)}
                >
                  <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: '700' }}>{LANGUAGES[id]}</Text>
                  {locked ? (
                    <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Crown size={10} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>PRO</Text>
                    </LinearGradient>
                  ) : language === id ? (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text></View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[sh.closeBtn, { backgroundColor: theme.bg3, margin: 16 }]} onPress={onClose}>
            <Text style={[sh.closeTxt, { color: theme.text }]}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sh = StyleSheet.create({
  sheet: { maxHeight: height * 0.88, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 3, textAlign: 'center', paddingVertical: 14 },
  themeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 10, borderRadius: 18, borderWidth: 1.5 },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 6, borderRadius: 16, borderWidth: 1.5 },
  closeBtn: { borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  closeTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
const EXPLORE_BANNER_SLOTS = [1, 8, 17, 4, 3, 5, 18, 0, 15, 16, 2, 7, 9, 10, 11, 13, 14] as const;

export default function ExploreScreen() {
  const { theme, isPro, isAdmin, user, swipesLeft, openSubscription, setOnSubscriptionOpen, themeId, setThemeId, language } = useTheme();
  const ex = getExploreCopy(language);
  const router = useRouter();
  const fonts = resolveTypeface(theme);
  const vibe = exploreBannerVibe(themeId, theme.isDark);
  const tickerColors = tickerChrome(theme, vibe);
  const bannerColors = useMemo(
    () => assignUniqueBannerGradients(vibe, [...EXPLORE_BANNER_SLOTS]),
    [vibe],
  );
  const color = (slot: number) => bannerColors.get(slot);
  const [showSub, setShowSub] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const openSubModal = useCallback(() => setShowSub(true), []);

  useEffect(() => {
    setOnSubscriptionOpen(() => {
      if (!isPro && !isAdmin) setShowSub(true);
    });
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [isPro, isAdmin, setOnSubscriptionOpen]);

  useFocusEffect(
    useCallback(() => {
      if (isPro || isAdmin) return;
      const t = setTimeout(() => openSubscription(), 550);
      return () => clearTimeout(t);
    }, [isPro, isAdmin, openSubscription]),
  );

  const gatePro = (fn: () => void) => {
    if (!isPro && !isAdmin) {
      openSubscription();
      return;
    }
    fn();
  };

  return (
    <View style={[es.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: headerFade, transform: [{ translateY: headerSlide }] }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

            <AppHeader
              variant="tabs"
              endSlot={
                isPro ? (
                  <TouchableOpacity onPress={openSubModal} accessibilityLabel="Subscription and plan">
                    <LinearGradient colors={['#FFD700', '#FF8C00']} style={es.proBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Crown size={16} color="#FFF" />
                      <Text style={es.proBadgeText}>PRO</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={openSubscription} style={[es.upgradeBtn, { backgroundColor: 'rgba(255,0,85,0.12)', borderColor: '#FF0055' }]}>
                    <Text style={{ color: '#FF0055', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>UPGRADE ›</Text>
                  </TouchableOpacity>
                )
              }
              subtitle={`${isAdmin ? 'Admin' : isPro ? 'Pro' : 'Hobby'} · ${user?.email ?? 'Signed in'}`}
            />
            {!isPro && !isAdmin && (
              <View style={[es.hobbyPill, { backgroundColor: theme.bg2, borderColor: theme.border, alignSelf: 'center', marginTop: 8, marginBottom: 4 }]}>
                <Text style={{ color: theme.textSub, fontSize: 11, fontWeight: '700' }}>
                  {swipesLeft} {ex.swipesLeftWeek}
                </Text>
              </View>
            )}

            <Ticker text={ex.tickerText} bg={tickerColors.bg} color={tickerColors.fg} speed={9200} height={26} />

            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionEveryone}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionEveryoneHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner slot={1} vibe={vibe} theme={theme} fonts={fonts} colors={color(1)} title={ex.settings} subtitle={ex.settingsSub} icon={<Settings size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/settings', params: exploreChildParams() })} />
              <GlowBanner slot={8} vibe={vibe} theme={theme} fonts={fonts} colors={color(8)} title={ex.bookmarks} subtitle={ex.bookmarksSub} italic icon={<BookmarkIcon size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/explore-bookmarks', params: exploreChildParams() })} />
              <GlowBanner slot={17} vibe={vibe} theme={theme} fonts={fonts} colors={color(17)} title={ex.notifications} subtitle={ex.notificationsSub} icon={<Bell size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/notifications', params: exploreChildParams() })} />
              <GlowBanner slot={4} vibe={vibe} theme={theme} fonts={fonts} colors={color(4)} title={ex.faq} subtitle={ex.faqSub} icon={<HelpCircle size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/explore-faq', params: exploreChildParams() })} />
              <GlowBanner slot={3} vibe={vibe} theme={theme} fonts={fonts} colors={color(3)} title={ex.rateUs} subtitle={ex.rateUsSub} italic icon={<Star size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/explore-rate', params: exploreChildParams() })} />
              <GlowBanner slot={5} vibe={vibe} theme={theme} fonts={fonts} colors={color(5)} title={ex.instagram} subtitle={ex.instagramSub} icon={<AtSign size={22} color="#FFF" />} onPress={() => { void Linking.openURL('https://instagram.com/ai.photodumps'); }} />
            </View>

            <View style={[es.sectionHead, { marginTop: 8 }]}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionPro}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionProHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner
                slot={6}
                vibe={vibe}
                theme={theme}
                fonts={fonts}
                title={ex.subscribe}
                subtitle={isPro ? ex.subscribeSubManage : ex.subscribeSubUpgrade}
                colors={SUBSCRIBE_BANNER_GRADIENT}
                subscribeShimmer={!isPro && !isAdmin}
                icon={<Crown size={22} color="#FFF" />}
                onPress={() => { if (isPro || isAdmin) openSubModal(); else openSubscription(); }}
              />
              <GlowBanner
                slot={18}
                vibe={vibe}
                theme={theme}
                fonts={fonts}
                colors={color(18)}
                title={ex.spinWheel}
                subtitle={ex.spinWheelSub}
                icon={<CircleDot size={22} color="#FFF" />}
                onPress={() => router.push({ pathname: '/spin-wheel', params: exploreChildParams() })}
              />
              <GlowBanner slot={0} vibe={vibe} theme={theme} fonts={fonts} colors={color(0)} title={ex.photobooth} subtitle={ex.photoboothSub} proLock={!isPro && !isAdmin} icon={<Camera size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/photobooth', params: exploreChildParams() }))} />
              <GlowBanner slot={10} vibe={vibe} theme={theme} fonts={fonts} colors={color(10)} title={ex.stickerStudio} subtitle={ex.stickerStudioSub} proLock={!isPro && !isAdmin} icon={<Sticker size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/sticker-studio', params: exploreChildParams() }))} />
              <GlowBanner slot={15} vibe={vibe} theme={theme} fonts={fonts} colors={color(15)} title={ex.videoTrim} subtitle={ex.videoTrimSub} proLock={!isPro && !isAdmin} icon={<Scissors size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/explore-trim', params: exploreChildParams() }))} />
              <GlowBanner slot={16} vibe={vibe} theme={theme} fonts={fonts} colors={color(16)} title={ex.duplicates} subtitle={ex.duplicatesSub} proLock={!isPro && !isAdmin} icon={<Layers2 size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/duplicates', params: exploreChildParams() }))} />
              <GlowBanner slot={2} vibe={vibe} theme={theme} fonts={fonts} colors={color(2)} title={ex.myStats} subtitle={ex.myStatsSub} proLock={!isPro && !isAdmin} icon={<BarChart2 size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/insights', params: exploreChildParams() }))} />
              <GlowBanner slot={7} vibe={vibe} theme={theme} fonts={fonts} colors={color(7)} title={ex.supercut} subtitle={ex.supercutSub} proLock={!isPro && !isAdmin} icon={<Zap size={22} color="#FFF" />} onPress={() => gatePro(() => router.push({ pathname: '/supercut', params: exploreChildParams() }))} />
            </View>

            <View style={[es.proLooksRail, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <View style={es.sectionHead}>
                <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionProLooks}</Text>
                <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  {ex.sectionProLooksHint}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={PRO_LOOK_SNAP}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 18, paddingTop: 4, gap: 14 }}
              >
                {PREMIUM_THEMES.map((id) => {
                  const locked = !isPro && !isAdmin;
                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (locked) { openSubscription(); return; }
                        void setThemeId(id);
                      }}
                      style={{ opacity: locked ? 0.55 : 1, marginRight: 0 }}
                    >
                      <View style={{ position: 'relative' }}>
                        <ThemeShowcaseCard id={id} active={themeId === id} cardWidth={PRO_LOOK_CARD_W} />
                        {locked && (
                          <View style={es.proStrip}>
                            <Crown size={11} color="#FFF" />
                            <Text style={es.proStripTxt}>PRO</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={es.section}>
              <GlowBanner slot={9} vibe={vibe} theme={theme} fonts={fonts} colors={color(9)} title={ex.appTheme} subtitle={ex.appThemeSub} proLock={!isPro && !isAdmin} icon={<Palette size={22} color="#FFF" />} onPress={() => { if (!isPro && !isAdmin) { openSubscription(); return; } setShowTheme(true); }} />
              <GlowBanner slot={11} vibe={vibe} theme={theme} fonts={fonts} colors={color(11)} title={ex.languages} subtitle={ex.languagesSub} proLock={!isPro && !isAdmin} icon={<Globe size={22} color="#FFF" />} onPress={() => { if (!isPro && !isAdmin) { openSubscription(); return; } setShowLang(true); }} />
            </View>

            <View style={[es.letterOuter, { borderColor: theme.border }]}>
              <ImageBackground source={EUGENE_PAPER} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
                <LinearGradient colors={['rgba(62,39,35,0.08)', 'rgba(62,39,35,0.14)']} style={StyleSheet.absoluteFill} />
                <View style={es.letterPanel}>
                  <Text style={es.letterMeta}>FROM EUGENE</Text>
                  <Text style={es.letterBody}>
                    {`Hey friend,\n\nThank you for letting photodumps live on your phone. Every swipe you take helps prove that a tiny team can build something honest, fast, and a little bit chaotic in the best way.\n\nI'm grateful you are here — whether you are on Hobby or Pro, you are part of the story. Stay tuned: we are cooking more playful features, kinder defaults, and surprises you can feel.\n\nWith love,\nEugene`}
                  </Text>
                </View>
              </ImageBackground>
            </View>

            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionLegal}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionLegalHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner slot={13} vibe={vibe} theme={theme} fonts={fonts} colors={color(13)} title={ex.terms} subtitle={ex.termsSub} icon={<FileText size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/explore-legal-terms', params: exploreChildParams() })} />
              <GlowBanner slot={14} vibe={vibe} theme={theme} fonts={fonts} colors={color(14)} title={ex.privacy} subtitle={ex.privacySub} icon={<FileText size={22} color="#FFF" />} onPress={() => router.push({ pathname: '/explore-legal-privacy', params: exploreChildParams() })} />
            </View>

            <View style={[es.klFooter, { borderColor: theme.border }]}>
              <ImageBackground source={PALM_KL} style={StyleSheet.absoluteFill} imageStyle={{ resizeMode: 'cover' }} />
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
              <View style={{ alignItems: 'center', zIndex: 2, paddingVertical: 28, paddingHorizontal: 22 }}>
                <Text style={es.klFooterTitle}>{ex.footerMadeIn}</Text>
                <Text style={es.klFooterSub}>{ex.footerSub}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => { if (isPro || isAdmin) openSubModal(); else openSubscription(); }}>
                    <Text style={es.klLink}>{ex.footerRestore}</Text>
                  </TouchableOpacity>
                  <Text style={es.klLink}>v3.0</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      <SubscriptionModal visible={showSub} onClose={() => setShowSub(false)} />
      <ThemeModal visible={showTheme} onClose={() => setShowTheme(false)} />
      <LanguageModal visible={showLang} onClose={() => setShowLang(false)} />
    </View>
  );
}

const es = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 18, paddingRight: 56 },
  appName: { fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  tagline: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  hobbyPill: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  proBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  upgradeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  sectionHead: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 4, textTransform: 'none' },
  galleryHint: { fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 4 },
  proStrip: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proStripTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  hobbyHint: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 14, borderRadius: 16, borderWidth: 1 },
  letterOuter: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 220,
    borderWidth: 1,
  },
  letterPanel: {
    margin: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 251, 245, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(74, 55, 40, 0.22)',
  },
  letterMeta: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12, color: '#6b5344' },
  letterBody: {
    fontFamily: Platform.OS === 'ios' ? 'American Typewriter' : 'monospace',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '500',
    color: '#3d2914',
  },
  proLooksRail: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  klFooter: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 200,
    borderWidth: 1,
  },
  klFooterTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  klFooterSub: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'American Typewriter' : 'monospace',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  klLink: {
    color: '#FFFACD',
    fontSize: 12,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});

