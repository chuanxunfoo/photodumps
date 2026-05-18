import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
  onPress?: () => void;
}

export function PremiumBadge({ size = 'sm', onPress }: PremiumBadgeProps) {
  const { openSubscription } = useTheme();
  const isSm = size === 'sm';

  return (
    <TouchableOpacity onPress={onPress ?? openSubscription} activeOpacity={0.8}>
      <LinearGradient
        colors={['#FFD700', '#FF8C00', '#FF4500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.badge, isSm ? styles.badgeSm : styles.badgeMd]}
      >
        <Crown size={isSm ? 9 : 12} color="#FFF" />
        {!isSm && <Text style={styles.badgeText}>PRO</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function PremiumRow({
  label,
  sub,
  onPress,
  children,
}: {
  label: string;
  sub?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const { theme, openSubscription } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress ?? openSubscription}
      style={[styles.row, { borderBottomColor: theme.border }]}
      activeOpacity={0.7}
    >
      {children && <View style={styles.rowIcon}>{children}</View>}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: theme.textMuted }]}>{sub}</Text>}
      </View>
      <PremiumBadge size="sm" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 3 },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowIcon: { width: 36, alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
});