import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { loadStreakState } from '../_lib/streakLogic';
import { resolveTypeface, useTheme } from '../(tabs)/ThemeContext';

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
  const { theme } = useTheme();
  const fonts = resolveTypeface(theme);
  const router = useRouter();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    void loadStreakState().then((s) => setStreak(Math.max(0, s.current)));
  }, []);

  const isTabs = variant === 'tabs';

  return (
    <View style={[styles.wrap, { borderBottomColor: theme.border }]}>
      <LinearGradient
        colors={
          theme.isDark
            ? ['rgba(255,0,85,0.14)', 'rgba(191,90,242,0.08)', 'transparent']
            : ['rgba(255,0,85,0.08)', 'rgba(96,165,250,0.12)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWash}
      />
      <View style={[styles.row, isTabs && styles.rowTabs]}>
        {variant === 'detail' && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
            accessibilityLabel="Go back"
            activeOpacity={0.85}
          >
            <ArrowLeft size={20} color={theme.text} />
          </TouchableOpacity>
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
                  textShadowColor: theme.isDark ? 'rgba(255,0,85,0.55)' : 'rgba(79,70,229,0.35)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: theme.isDark ? 14 : 6,
                },
              ]}
            >
              photodumps
            </Text>
          </Pressable>
          <LinearGradient
            colors={[theme.accent, '#FF6B9D', '#60A5FA']}
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
              colors={['#FF6B2C', '#FF0055']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.streakChip}
            >
              <Flame size={15} color="#FFF" strokeWidth={2.2} fill="rgba(255,255,255,0.2)" />
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
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
