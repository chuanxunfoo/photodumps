import type { ThemeId } from '../(tabs)/ThemeContext';

export type ChalkboardPalette = {
  base: string;
  grain: string;
  frame: string;
  chalkDust: string;
};

/** Realistic chalkboard tones per app theme. */
export function chalkboardForTheme(themeId: ThemeId): ChalkboardPalette {
  switch (themeId) {
    case 'light':
      return {
        base: '#F2EDE4',
        grain: 'rgba(40,32,24,0.14)',
        frame: '#8B7355',
        chalkDust: 'rgba(255,255,255,0.35)',
      };
    case 'dark':
      return {
        base: '#1C1C1E',
        grain: 'rgba(255,255,255,0.1)',
        frame: '#3A3A3C',
        chalkDust: 'rgba(255,255,255,0.06)',
      };
    case 'cyberpunk':
      return {
        base: '#0A0812',
        grain: 'rgba(255,0,170,0.08)',
        frame: '#FF00AA',
        chalkDust: 'rgba(0,240,255,0.05)',
      };
    case 'vintage':
      return {
        base: '#4A3728',
        grain: 'rgba(20,12,8,0.22)',
        frame: '#2E2118',
        chalkDust: 'rgba(245,230,200,0.08)',
      };
    case 'zen':
      return {
        base: '#B8A898',
        grain: 'rgba(50,40,32,0.18)',
        frame: '#7A6B5C',
        chalkDust: 'rgba(255,252,245,0.2)',
      };
    case 'y2k':
      return {
        base: '#E8D4F0',
        grain: 'rgba(120,60,140,0.12)',
        frame: '#C77DFF',
        chalkDust: 'rgba(255,255,255,0.28)',
      };
    default:
      return {
        base: '#2A2A2A',
        grain: 'rgba(255,255,255,0.1)',
        frame: '#444444',
        chalkDust: 'rgba(255,255,255,0.06)',
      };
  }
}
