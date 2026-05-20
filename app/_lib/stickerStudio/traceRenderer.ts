import type { TraceSettings, TraceStyle } from './types';

export type TraceRenderParams = {
  radius: number;
  steps: number;
  layerOpacity: number;
  blur: number;
  scaleBoost: number;
  /** Toon uses canvas chalk processor instead of offset layers. */
  grainy: boolean;
};

const MAX_RADIUS = 40;

export function getTraceRenderParams(trace: TraceSettings): TraceRenderParams | null {
  if (trace.style === 'none' || trace.width <= 0) return null;

  const radius = Math.max(1, Math.min(MAX_RADIUS, trace.width));
  const steps = Math.max(14, Math.min(44, Math.round(radius * 2.8)));

  switch (trace.style) {
    case 'chalk':
      return {
        radius,
        steps,
        layerOpacity: 0.95,
        blur: 0.4 + radius * 0.14,
        scaleBoost: 0,
        grainy: false,
      };
    case 'chalk-plus':
      return {
        radius: radius * 0.98,
        steps: steps + 2,
        layerOpacity: 0.88,
        blur: 0.8 + radius * 0.16,
        scaleBoost: 0.018,
        grainy: false,
      };
    case 'glow':
      return {
        radius: radius * 1.05,
        steps: Math.max(18, Math.round(radius * 3.2)),
        layerOpacity: 0.65,
        blur: 2.2 + radius * 0.28,
        scaleBoost: 0.03,
        grainy: false,
      };
    case 'toon':
      return {
        radius,
        steps: Math.max(20, Math.round(radius * 3.2)),
        layerOpacity: 0.94,
        blur: 0.3 + radius * 0.09,
        scaleBoost: 0.02,
        grainy: true,
      };
    default:
      return null;
  }
}

/** Smooth solid silhouette stroke (Chalk, Chalk+, Glow). */
export function buildStrokeOffsets(
  steps: number,
  radius: number,
): { x: number; y: number }[] {
  return Array.from({ length: steps }, (_, i) => {
    const angle = (2 * Math.PI * i) / steps;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export const TRACE_STYLE_OPTIONS: { id: TraceStyle; label: string; hint: string }[] = [
  { id: 'none', label: 'Plain', hint: 'Cutout only' },
  { id: 'chalk', label: 'Chalk', hint: 'Clean sticker edge' },
  { id: 'chalk-plus', label: 'Chalk+', hint: 'Soft pastel edge' },
  { id: 'toon', label: 'Toon', hint: 'Chalk grain sticker edge' },
  { id: 'glow', label: 'Glow', hint: 'Soft halo' },
];

export const TRACE_COLOR_PRESETS: { color: string; label: string }[] = [
  { color: '#FFFFFF', label: 'White' },
  { color: '#FFF8E7', label: 'Cream' },
  { color: '#FFF4A3', label: 'Butter' },
  { color: '#FFEC8A', label: 'Lemon' },
  { color: '#FFB3C8', label: 'Pink' },
  { color: '#FFC8DD', label: 'Rose' },
  { color: '#FFD4B8', label: 'Peach' },
  { color: '#C4B5FD', label: 'Lavender' },
  { color: '#E8D4FF', label: 'Lilac' },
  { color: '#B8E8FF', label: 'Sky' },
  { color: '#5EEAD4', label: 'Mint' },
  { color: '#C8E6C9', label: 'Sage' },
  { color: '#FFD54F', label: 'Gold' },
  { color: '#1A1A1A', label: 'Ink' },
];

export const TRACE_WIDTH_MIN = 1;
export const TRACE_WIDTH_MAX = 40;
