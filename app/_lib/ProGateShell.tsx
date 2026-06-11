import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../(tabs)/ThemeContext';

export function ProGateShell({ label = 'Opening subscription…' }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.label, { color: theme.textSub }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
