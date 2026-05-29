import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MinimalBackButton } from './MinimalBackButton';
import { STREAK_FIRE_THRESHOLD, StreakFire } from './streak/StreakFire';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { loadStreakState } from '../_lib/streakLogic';
import { resolveTypeface, useTheme, type ThemeId } from '../(tabs)/ThemeContext';

function headerWashColors(themeId: ThemeId, isDark: boolean): [string, string, string] {
  if (themeId === 'cyberpunk') return ['rgba(255,0,170,0.14)', 'rgba(0,240,255,0.1)', 'transparent'];
  if (themeId === 'y2k') return ['rgba(255,110,199,0.14)', 'rgba(123,240,255,0.1)', 'transparent'];
  if (themeId === 'vintage') return ['rgba(139,111,71,0.1)', 'rgba(212,196,176,0.14)', 'transparent'];
  if (themeId === 'zen') return ['rgba(168,181,160,0.12)', 'rgba(242,237,228,0.2)', 'transparent'];
  if (isDark) return ['rgba(255,0,85,0.08)', 'rgba(96,165,250,0.06)', 'transparent'];
  return ['rgba(255,0,85,0.06)', 'rgba(37,99,235,0.08)', 'transparent'];
}

type Props = {
  variant: 'tabs' | 'detail';
  onBack?: () => void;
  /** Extra control before streak (e.g. queue / upgrade). */
  endSlot?: React.ReactNode;
  /** Slim second line under the title row. */
  subtitle?: string | null;
  /** e.g. Explore admin easter egg (triple-tap on title). */
  onTitlePress?: () => void;
};

export function AppHeader({ variant, onBack, endSlot, subtitle, onTitlePress }: Props) {
  const { theme, themeId } = useTheme();
  const fonts = resolveTypeface(theme);
  const router = useRouter();
  const [streak, setStreak] = useState(0);

  const refreshStreak = useCallback(() => {
    void loadStreakState().then(s => setStreak(Math.max(0, s.current)));
  }, []);

  useEffect(() => {
    refreshStreak();
  }, [refreshStreak]);

  useFocusEffect(
    useCallback(() => {
      refreshStreak();
    }, [refreshStreak]),
  );

  const onFire = streak >= STREAK_FIRE_THRESHOLD;

  const isTabs = variant === 'tabs';

  return (
    <View style={[styles.wrap, { borderBottomColor: theme.border }]}>
      <LinearGradient
        colors={headerWashColors(themeId, theme.isDark)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWash}
      />
      <View style={[styles.row, isTabs && styles.rowTabs]}>
        {variant === 'detail' && onBack ? (
          <MinimalBackButton onPress={onBack} color={theme.text} size={26} />
        ) : null}

        <View style={[styles.titleBlock, isTabs && styles.titleBlockTabs, variant === 'detail' && styles.titleBlockDetail]}>
          <Pressable onPress={onTitlePress} disabled={!onTitlePress} style={[styles.titlePress, isTabs && styles.titlePressTabs]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.brand,
                isTabs && styles.brandTabs,
                {
                  color: theme.text,
                  fontFamily: fonts.titleFont,
                  textShadowColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: theme.isDark ? 8 : 4,
                },
              ]}
            >
              photodumps
            </Text>
          </Pressable>
          <LinearGradient
            colors={[theme.accent, theme.accent2, theme.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.brandUnderline,
              { opacity: theme.isDark ? 0.9 : 0.75 },
              isTabs ? styles.brandUnderlineTabs : null,
            ]}
          />
        </View>

        <View style={styles.rightCluster}>
          {endSlot}
          <Pressable
            onPress={() => router.push('/streak')}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            accessibilityLabel="Open streak calendar"
          >
            <LinearGradient
              colors={onFire ? ['#FF8C00', '#FF5C00'] : [theme.accent2, theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.streakChip, onFire && styles.streakChipFire]}
            >
              <StreakFire size={16} color="#FFF" active={onFire} />
              <Text style={styles.streakNum}>{streak > 99 ? '99+' : streak}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      {subtitle ? (
        <Text
          numberOfLines={2}
          style={[
            styles.sub,
            { color: theme.textSub, fontFamily: fonts.bodyFont },
            isTabs && styles.subTabs,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  headerWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 8,
  },
  rowTabs: {
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, justifyContent: 'center', paddingHorizontal: 2, minWidth: 0 },
  titleBlockTabs: {
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  titleBlockDetail: {
    alignItems: 'center',
  },
  titlePress: { alignSelf: 'center', maxWidth: '100%' },
  titlePressTabs: { alignSelf: 'flex-start' },
  brandUnderline: {
    height: 3,
    width: '72%',
    maxWidth: 200,
    borderRadius: 2,
    marginTop: 4,
    alignSelf: 'center',
  },
  brandUnderlineTabs: {
    alignSelf: 'flex-start',
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  brandTabs: {
    textAlign: 'left',
  },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  streakChipFire: {
    borderColor: 'rgba(255,220,120,0.55)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  streakNum: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 14,
    textAlign: 'center',
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subTabs: {
    textAlign: 'left',
    alignSelf: 'stretch',
    paddingLeft: 2,
    marginTop: 6,
  },
});
