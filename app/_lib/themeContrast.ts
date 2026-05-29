import type { ThemeColors, ThemeId } from '../(tabs)/ThemeContext';

export function hexLuma(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0.5;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** High-contrast label on a solid or gradient fill (uses leading colour). */
export function textOnHex(hex: string): '#111111' | '#FFFFFF' {
  return hexLuma(hex) > 0.52 ? '#111111' : '#FFFFFF';
}

export function textOnAccent(theme: ThemeColors): '#111111' | '#FFFFFF' {
  return textOnHex(theme.accent);
}

export function textOnPair(pair: [string, string]): '#111111' | '#FFFFFF' {
  return textOnHex(pair[0]);
}

export type PlanCardSurface = {
  border: string;
  bg: string;
  radioBorder: string;
  label: string;
  sub: string;
  price: string;
  usd: string;
};

function accentLabelColor(accent: string, theme: ThemeColors, selected: boolean): string {
  if (!selected) return theme.text;
  return hexLuma(accent) > 0.55 ? accent : theme.text;
}

export function planCardSurface(
  theme: ThemeColors,
  selected: boolean,
  accent: string,
  isFree: boolean,
): PlanCardSurface {
  if (theme.isDark) {
    return {
      border: selected ? accent : isFree ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
      bg: selected && !isFree ? accent + '14' : 'rgba(255,255,255,0.04)',
      radioBorder: selected ? accent : 'rgba(255,255,255,0.28)',
      label: isFree ? theme.textMuted : accentLabelColor(accent, theme, selected),
      sub: theme.textSub,
      price: isFree ? theme.textMuted : theme.text,
      usd: theme.textSub,
    };
  }
  return {
    border: selected ? accent : theme.border,
    bg: selected && !isFree ? accent + '18' : theme.card,
    radioBorder: selected ? accent : theme.border,
    label: isFree ? theme.textMuted : accentLabelColor(accent, theme, selected),
    sub: theme.textSub,
    price: isFree ? theme.textMuted : theme.text,
    usd: theme.textSub,
  };
}

export type PromoHeroStyle = {
  gradient: [string, string, string];
  title: string;
  sub: string;
  rating: string;
};

export function subscriptionHeroStyle(_themeId: ThemeId, theme: ThemeColors): PromoHeroStyle {
  if (theme.isDark) {
    return {
      gradient: ['#08001C', '#10003A', '#08001C'],
      title: '#FFFFFF',
      sub: 'rgba(255,255,255,0.55)',
      rating: 'rgba(255,255,255,0.45)',
    };
  }
  return {
    gradient: [theme.accent + '22', theme.bg2, theme.bg],
    title: theme.text,
    sub: theme.textSub,
    rating: theme.textMuted,
  };
}

export function calloutTextStyle(theme: ThemeColors) {
  return {
    body: theme.textSub,
    bold: theme.isDark ? '#FFD600' : theme.accent,
  };
}

/** CTA label on plan-colour gradient buttons. */
export function subscriptionCtaInk(colors: [string, string]): '#111111' | '#FFFFFF' {
  return textOnHex(colors[0]);
}

export function insightsHeroGradient(themeId: ThemeId, theme: ThemeColors): [string, string, string] {
  if (theme.isDark) return ['#0f172a', '#4c1d95', '#be123c'];
  switch (themeId) {
    case 'vintage':
      return ['#8B6F47', '#D4C4B0', '#F5F0E6'];
    case 'zen':
      return ['#6B7B6B', '#A8B5A0', '#F2EDE4'];
    case 'y2k':
      return ['#FF6EC7', '#C77DFF', '#F5E6FF'];
    case 'cyberpunk':
      return ['#120E22', '#7000FF', '#FF00AA'];
    default:
      return [theme.accent, theme.accent2, theme.bg2];
  }
}

export function insightsHeroText(theme: ThemeColors, gradient: [string, string, string]) {
  const onFill = textOnHex(gradient[0]);
  if (theme.isDark) {
    return {
      badge: 'rgba(255,255,255,0.85)',
      kicker: 'rgba(255,255,255,0.55)',
      big: '#FFFFFF',
      sub: 'rgba(255,255,255,0.65)',
      mid: '#E9D5FF',
      divider: 'rgba(255,255,255,0.12)',
      btnBg: 'rgba(255,255,255,0.14)',
      btnTxt: '#FFFFFF',
      border: 'rgba(255,255,255,0.12)',
    };
  }
  const darkText = onFill === '#111111';
  return {
    badge: darkText ? theme.text : '#FFFFFF',
    kicker: darkText ? theme.textSub : 'rgba(255,255,255,0.88)',
    big: darkText ? theme.text : '#FFFFFF',
    sub: darkText ? theme.textSub : 'rgba(255,255,255,0.9)',
    mid: darkText ? theme.accent : '#FFFFFF',
    divider: darkText ? theme.border : 'rgba(255,255,255,0.25)',
    btnBg: darkText ? theme.accentSoft : 'rgba(255,255,255,0.22)',
    btnTxt: darkText ? theme.text : '#FFFFFF',
    border: darkText ? theme.border : 'rgba(255,255,255,0.2)',
  };
}

export function notificationsHeroGradient(themeId: ThemeId, theme: ThemeColors): [string, string, string] {
  if (theme.isDark) return ['#4F46E5', '#7C3AED', '#EC4899'];
  switch (themeId) {
    case 'vintage':
      return ['#8B6F47', '#C9A227', '#F5F0E6'];
    case 'zen':
      return ['#6B7B6B', '#98B8C8', '#F2EDE4'];
    case 'y2k':
      return ['#FF6EC7', '#7BF0FF', '#F5E6FF'];
    default:
      return [theme.accent, theme.accent2, theme.bg3];
  }
}

export function pageAccentWash(themeId: ThemeId, theme: ThemeColors): [string, string, string] {
  if (theme.isDark) {
    if (themeId === 'cyberpunk') return [theme.bg, '#0A0020', theme.bg];
    return [theme.bg, '#120018', theme.bg];
  }
  return [theme.bg, theme.bg2, theme.bg];
}
