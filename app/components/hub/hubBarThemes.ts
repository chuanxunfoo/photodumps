import type { ThemeId } from '../../(tabs)/ThemeContext';

export type HubBarSpec = {
  kind: 'gradient';
  colors: [string, string];
  titleColor: string;
  subtitleColor: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  chevronColor: string;
  /** Zen / Y2K depth plate */
  shadowColor?: string;
};

function hexLuma(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0.5;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function onColor(bg: string): string {
  return hexLuma(bg) > 0.52 ? '#111111' : '#FFFFFF';
}

function gradSpec(a: string, b: string, shadow?: string): HubBarSpec {
  const titleColor = onColor(a);
  return {
    kind: 'gradient',
    colors: [a, b],
    titleColor,
    subtitleColor: titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.94)' : 'rgba(17,17,17,0.8)',
    iconBg: titleColor === '#FFFFFF' ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.42)',
    iconColor: titleColor,
    borderColor: titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.14)',
    chevronColor: titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.9)' : 'rgba(17,17,17,0.52)',
    shadowColor: shadow ?? `${b}88`,
  };
}

const HUB_BARS: Record<ThemeId, HubBarSpec[]> = {
  light: [
    gradSpec('#FF4D8D', '#FF8A5C'),
    gradSpec('#3B82F6', '#60A5FA'),
    gradSpec('#8B5CF6', '#C084FC'),
    gradSpec('#06B6D4', '#22D3EE'),
    gradSpec('#F59E0B', '#FBBF24'),
    gradSpec('#10B981', '#34D399'),
    gradSpec('#EC4899', '#F472B6'),
    gradSpec('#6366F1', '#818CF8'),
    gradSpec('#0EA5E9', '#38BDF8'),
    gradSpec('#EF4444', '#FCA5A5'),
    gradSpec('#84CC16', '#A3E635'),
    gradSpec('#F97316', '#FDBA74'),
    gradSpec('#14B8A6', '#5EEAD4'),
    gradSpec('#D946EF', '#F0ABFC'),
    gradSpec('#A855F7', '#E879F9'),
    gradSpec('#0D9488', '#2DD4BF'),
    gradSpec('#E11D48', '#FB7185'),
    gradSpec('#2563EB', '#93C5FD'),
  ],
  dark: [
    gradSpec('#FF0055', '#FF5500'),
    gradSpec('#6366F1', '#A855F7'),
    gradSpec('#0EA5E9', '#06B6D4'),
    gradSpec('#E11D48', '#FB7185'),
    gradSpec('#F59E0B', '#F97316'),
    gradSpec('#10B981', '#34D399'),
    gradSpec('#C026D3', '#EC4899'),
    gradSpec('#3B82F6', '#60A5FA'),
    gradSpec('#14B8A6', '#22C55E'),
    gradSpec('#F43F5E', '#FDA4AF'),
    gradSpec('#8B5CF6', '#C4B5FD'),
    gradSpec('#38BDF8', '#2563EB'),
    gradSpec('#FBBF24', '#FDE047'),
    gradSpec('#4ADE80', '#059669'),
    gradSpec('#F472B6', '#DB2777'),
    gradSpec('#818CF8', '#4F46E5'),
    gradSpec('#2DD4BF', '#0D9488'),
    gradSpec('#FF8C00', '#FFD600'),
  ],
  cyberpunk: [
    gradSpec('#FF00AA', '#7000FF'),
    gradSpec('#00F0FF', '#0066FF'),
    gradSpec('#FF0055', '#FFCC00'),
    gradSpec('#BD00FF', '#FF6B9D'),
    gradSpec('#00FF9C', '#00B8FF'),
    gradSpec('#FF6B00', '#FF0055'),
    gradSpec('#00E5FF', '#7C3AED'),
    gradSpec('#FF1493', '#00CED1'),
    gradSpec('#39FF14', '#00F5FF'),
    gradSpec('#FF4FD8', '#9333EA'),
    gradSpec('#00FFA3', '#FF00AA'),
    gradSpec('#FBBF24', '#FF0055'),
    gradSpec('#22D3EE', '#FF00CC'),
    gradSpec('#00FFC6', '#FF2BA6'),
    gradSpec('#C77DFF', '#00E5FF'),
    gradSpec('#FF10F0', '#00FFF0'),
    gradSpec('#FF5500', '#FFD600'),
    gradSpec('#00FFF0', '#FF00AA'),
  ],
  vintage: [
    gradSpec('#5C4033', '#8B6914'),
    gradSpec('#C4654A', '#8B4513'),
    gradSpec('#3D5C40', '#6B8F71'),
    gradSpec('#8B6914', '#C9A227'),
    gradSpec('#6F4E37', '#A67C52'),
    gradSpec('#4A3728', '#7A6340'),
    gradSpec('#B5523B', '#D4897A'),
    gradSpec('#5A4A38', '#947050'),
    gradSpec('#6B5538', '#B8956A'),
    gradSpec('#8B7355', '#D4C4B0'),
    gradSpec('#4A5D4A', '#7A9E7E'),
    gradSpec('#9A8468', '#C4B896'),
    gradSpec('#7D6A58', '#B07A5A'),
    gradSpec('#3E3228', '#6B5B4A'),
    gradSpec('#A08058', '#E8D4B8'),
    gradSpec('#5C4033', '#C4654A'),
    gradSpec('#6B8F71', '#4A6741'),
    gradSpec('#947050', '#D4A574'),
  ],
  zen: [
    gradSpec('#5C6B5A', '#8FA898', '#4A5D52'),
    gradSpec('#6B7B6B', '#A8B5A0', '#5C6B5A'),
    gradSpec('#4A6741', '#7A9E7E', '#3D5C40'),
    gradSpec('#8B7355', '#C0A878', '#6B5B4A'),
    gradSpec('#5C7A8A', '#98B8C8', '#4A6270'),
    gradSpec('#6B6558', '#A89888', '#5A5048'),
    gradSpec('#5A7268', '#88B0A0', '#4A6258'),
    gradSpec('#7A6B58', '#B8A090', '#6B5B4A'),
    gradSpec('#4A6B5C', '#7A9A8C', '#3D5A4C'),
    gradSpec('#8A7A68', '#C4B4A4', '#6B5B50'),
    gradSpec('#5C6858', '#90A888', '#4A5848'),
    gradSpec('#6B7B6B', '#B0C0B0', '#5A6A5A'),
    gradSpec('#4A5D52', '#809890', '#3D4D48'),
    gradSpec('#9A8468', '#D8C8B0', '#7A6848'),
    gradSpec('#5A7A6A', '#9AC8B8', '#4A6A5A'),
    gradSpec('#6B5B4A', '#A09080', '#5A4B3A'),
    gradSpec('#4A6741', '#6B8F71', '#3D5C40'),
    gradSpec('#7A8A7A', '#B0C0B0', '#5A6A5A'),
  ],
  y2k: [
    gradSpec('#FF2BA6', '#FF6EC7'),
    gradSpec('#00F5FF', '#7BF0FF'),
    gradSpec('#FFE066', '#FF9E00'),
    gradSpec('#FF00CC', '#8338EC'),
    gradSpec('#00FFC6', '#5EEAD4'),
    gradSpec('#FF48B0', '#FFB0E8'),
    gradSpec('#8338EC', '#C77DFF'),
    gradSpec('#FF1493', '#00CED1'),
    gradSpec('#39FF14', '#00F5D4'),
    gradSpec('#FF6EC7', '#B8F0FF'),
    gradSpec('#FFD600', '#FF6B9D'),
    gradSpec('#00E5FF', '#FF00AA'),
    gradSpec('#FF58B8', '#98D0F8'),
    gradSpec('#FF0055', '#00FFF0'),
    gradSpec('#C77DFF', '#7BF0FF'),
    gradSpec('#FF10F0', '#48E8FF'),
    gradSpec('#FF9AD8', '#00FFC6'),
    gradSpec('#FF2E88', '#7BF0FF'),
  ],
};

export const CALENDAR_SLOT = {
  capsule: 0,
  deepClean: 1,
  random: 2,
  jan: 3,
  feb: 4,
  mar: 5,
  apr: 6,
  may: 7,
  jun: 8,
  jul: 9,
  aug: 10,
  sep: 11,
  oct: 12,
  nov: 13,
  dec: 14,
} as const;

const CALENDAR_GRADIENTS: Record<ThemeId, [string, string][]> = {
  light: [
    ['#2563EB', '#38BDF8'],
    ['#EA580C', '#FBBF24'],
    ['#FF6B9D', '#FFD93D'],
    ['#4FACFE', '#00F2FE'],
    ['#FA709A', '#FEE140'],
    ['#43E97B', '#38F9D7'],
    ['#667EEA', '#764BA2'],
    ['#F093FB', '#F5576C'],
    ['#4FD1C5', '#63B3ED'],
    ['#FC5C7D', '#6A82FB'],
    ['#11998E', '#38EF7D'],
    ['#EE609C', '#B465DA'],
    ['#F7971E', '#FFD200'],
    ['#56CCF2', '#2F80ED'],
    ['#12C2E9', '#C471ED'],
  ],
  dark: [
    ['#FF0055', '#FF5500'],
    ['#6366F1', '#A855F7'],
    ['#0EA5E9', '#06B6D4'],
    ['#E11D48', '#FB7185'],
    ['#10B981', '#34D399'],
    ['#C026D3', '#EC4899'],
    ['#F59E0B', '#F97316'],
    ['#8B5CF6', '#C4B5FD'],
    ['#14B8A6', '#22C55E'],
    ['#F43F5E', '#FDA4AF'],
    ['#38BDF8', '#2563EB'],
    ['#FBBF24', '#FDE047'],
    ['#4ADE80', '#059669'],
    ['#F472B6', '#DB2777'],
    ['#818CF8', '#4F46E5'],
  ],
  cyberpunk: [
    ['#FF00AA', '#7000FF'],
    ['#00F0FF', '#0066FF'],
    ['#FF0055', '#FFCC00'],
    ['#BD00FF', '#FF6B9D'],
    ['#00FF9C', '#00B8FF'],
    ['#FF6B00', '#FF0055'],
    ['#00E5FF', '#7C3AED'],
    ['#FF1493', '#00CED1'],
    ['#39FF14', '#00F5FF'],
    ['#FF4FD8', '#9333EA'],
    ['#00FFA3', '#FF00AA'],
    ['#FBBF24', '#FF0055'],
    ['#22D3EE', '#FF00CC'],
    ['#00FFC6', '#FF2BA6'],
    ['#C77DFF', '#00E5FF'],
  ],
  vintage: [
    ['#5C4033', '#8B6914'],
    ['#6F4E37', '#A67C52'],
    ['#4A6741', '#6B8F71'],
    ['#8B4513', '#C9A227'],
    ['#B5523B', '#D4897A'],
    ['#3E3228', '#6B5538'],
    ['#7A6340', '#B8956A'],
    ['#5A4A38', '#947050'],
    ['#6B5B4A', '#9A8468'],
    ['#4A5D4A', '#7A9E7E'],
    ['#C4654A', '#8B4513'],
    ['#8B7355', '#D4C4B0'],
    ['#5C4033', '#C9A227'],
    ['#6B8F71', '#4A6741'],
    ['#947050', '#D4A574'],
  ],
  zen: [
    ['#5C6B5A', '#8FA898'],
    ['#6B7B6B', '#A8B5A0'],
    ['#4A6741', '#7A9E7E'],
    ['#8B7355', '#C0A878'],
    ['#5C7A8A', '#98B8C8'],
    ['#6B6558', '#A89888'],
    ['#5A7268', '#88B0A0'],
    ['#7A6B58', '#B8A090'],
    ['#4A6B5C', '#7A9A8C'],
    ['#8A7A68', '#C4B4A4'],
    ['#5C6858', '#90A888'],
    ['#6B7B6B', '#B0C0B0'],
    ['#4A5D52', '#809890'],
    ['#9A8468', '#D8C8B0'],
    ['#5A7A6A', '#9AC8B8'],
  ],
  y2k: [
    ['#FF2BA6', '#FF6EC7'],
    ['#00F5FF', '#7BF0FF'],
    ['#FFE066', '#FF9E00'],
    ['#FF00CC', '#8338EC'],
    ['#00FFC6', '#5EEAD4'],
    ['#FF48B0', '#FFB0E8'],
    ['#8338EC', '#C77DFF'],
    ['#FF1493', '#00CED1'],
    ['#39FF14', '#00F5D4'],
    ['#FF6EC7', '#B8F0FF'],
    ['#FFD600', '#FF6B9D'],
    ['#00E5FF', '#FF00AA'],
    ['#FF58B8', '#98D0F8'],
    ['#FF0055', '#00FFF0'],
    ['#C77DFF', '#7BF0FF'],
  ],
};

export function hubBarSpec(themeId: ThemeId, slot: number): HubBarSpec {
  const pool = HUB_BARS[themeId] ?? HUB_BARS.light;
  return pool[((slot % pool.length) + pool.length) % pool.length];
}

export function hubBarGradientColors(spec: HubBarSpec): [string, string] {
  return spec.colors;
}

export function calendarGradient(themeId: ThemeId, slot: number): [string, string] {
  const pool = CALENDAR_GRADIENTS[themeId] ?? CALENDAR_GRADIENTS.light;
  return pool[((slot % pool.length) + pool.length) % pool.length];
}

export function calendarCapsuleGradient(themeId: ThemeId): [string, string] {
  return calendarGradient(themeId, CALENDAR_SLOT.capsule);
}

export function calendarDeepCleanGradient(themeId: ThemeId): [string, string] {
  return calendarGradient(themeId, CALENDAR_SLOT.deepClean);
}

export function contrastOnGradient(pair: [string, string]): { titleColor: string; subtitleColor: string } {
  const titleColor = onColor(pair[0]);
  return {
    titleColor,
    subtitleColor: titleColor === '#FFFFFF' ? 'rgba(255,255,255,0.94)' : 'rgba(17,17,17,0.8)',
  };
}
