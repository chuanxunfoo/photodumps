import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../(tabs)/ThemeContext';

type Props = {
  title?: string;
  onBack?: () => void;
};

/** Instant paint while a heavy feature route hydrates. */
export function ScreenBootShell({ title, onBack }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <AppHeader variant="detail" onBack={onBack} subtitle={title} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
