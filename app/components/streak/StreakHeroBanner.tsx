import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { calendarBannerGradient } from '../hub/exploreUi';
import { contrastOnGradient } from '../hub/hubBarThemes';
import { STREAK_FIRE_THRESHOLD, StreakFire } from './StreakFire';

type Props = {
  streak: number;
  best: number;
};

/** Theme-aware hero banner — calendar / streak page only. */
export function StreakHeroBanner({ streak, best }: Props) {
  const { theme, themeId } = useTheme();
  const fonts = resolveTypeface(theme);
  const colors = calendarBannerGradient(themeId, theme);
  const tone = contrastOnGradient(colors);
  const onFire = streak >= STREAK_FIRE_THRESHOLD;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.banner,
        {
          borderRadius: theme.radiusLg,
          borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <Text style={[styles.kicker, { color: tone.subtitleColor, fontFamily: fonts.bodyFont }]}>
        DAILY STREAK
      </Text>
      <View style={styles.row}>
        {onFire ? (
          <View style={styles.fireSide}>
            <StreakFire size={36} color={tone.titleColor} active />
          </View>
        ) : null}
        <View style={styles.numBlock}>
          <Text style={[styles.num, { color: tone.titleColor, fontFamily: fonts.titleFont }]}>{streak}</Text>
          <Text style={[styles.lbl, { color: tone.subtitleColor, fontFamily: fonts.bodyFont }]}>days in a row</Text>
        </View>
        {onFire ? (
          <View style={styles.fireSide}>
            <StreakFire size={36} color={tone.titleColor} active />
          </View>
        ) : null}
      </View>
      <Text style={[styles.best, { color: tone.subtitleColor, fontFamily: fonts.bodyFont }]}>
        Best {best} {best === 1 ? 'day' : 'days'}
        {onFire ? ' · You are on fire' : ''}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  kicker: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fireSide: { width: 44, alignItems: 'center' },
  numBlock: { alignItems: 'center', minWidth: 100 },
  num: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  lbl: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  best: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
  },
});
