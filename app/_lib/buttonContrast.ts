import type { ThemeColors } from '../(tabs)/ThemeContext';

/** High-contrast primary / secondary button colors for light and dark themes. */
export function primaryButtonColors(theme: ThemeColors): { bg: string; text: string } {
  return { bg: theme.accent, text: '#FFFFFF' };
}

export function secondaryButtonColors(theme: ThemeColors): { bg: string; text: string; border: string } {
  if (theme.isDark) {
    return { bg: '#FFFFFF', text: '#12141A', border: '#FFFFFF' };
  }
  return { bg: theme.bg2, text: theme.text, border: theme.border };
}

export function dangerButtonColors(theme: ThemeColors): { bg: string; text: string } {
  return { bg: theme.danger, text: '#FFFFFF' };
}
