import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../(tabs)/ThemeContext';

type BackProps = {
  onPress: () => void;
  color?: string;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Bare chevron — no box, used for hub sub-page navigation. */
export function MinimalBackButton({
  onPress,
  color,
  size = 24,
  strokeWidth = 2.25,
  style,
  accessibilityLabel = 'Go back',
}: BackProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={14}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [styles.back, style, pressed && styles.pressed]}
    >
      <ChevronLeft size={size} color={color ?? theme.text} strokeWidth={strokeWidth} />
    </Pressable>
  );
}

type ForwardProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

/** Trailing chevron on list rows / banners. */
export function MinimalForwardChevron({
  color = 'rgba(255,255,255,0.82)',
  size = 22,
  strokeWidth = 2.25,
}: ForwardProps) {
  return <ChevronRight size={size} color={color} strokeWidth={strokeWidth} />;
}

const styles = StyleSheet.create({
  back: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 4,
  },
  pressed: { opacity: 0.55 },
});
