import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreakCalendarContent } from '../components/StreakCalendarContent';
import { AppHeader } from '../components/AppHeader';
import { calendarBannerGradient } from '../components/hub/exploreUi';
import { resolveTypeface, useTheme } from './ThemeContext';

export default function StreakScreen() {
  const router = useRouter();
  const { theme, themeId } = useTheme();
  const fonts = resolveTypeface(theme);
  const wash = calendarBannerGradient(themeId, theme);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[wash[0] + '22', theme.bg, theme.bg2]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader variant="detail" onBack={() => router.back()} subtitle="Your streak" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
            Open photodumps daily to build your streak. Every day you show up is a win for a lighter library.
          </Text>
          <StreakCalendarContent />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 12,
  },
  sub: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    textAlign: 'center',
  },
});
