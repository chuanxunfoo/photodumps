import type { LegacyFrameId, TraceSettings } from './types';
import { DEFAULT_TRACE } from './types';

export {
  TRACE_COLOR_PRESETS,
  TRACE_STYLE_OPTIONS,
  TRACE_WIDTH_MAX,
  TRACE_WIDTH_MIN,
  buildStrokeOffsets,
  getTraceRenderParams,
} from './traceRenderer';
export type { TraceRenderParams } from './traceRenderer';

export function legacyTraceFromFrameId(frameId?: LegacyFrameId): TraceSettings {
  switch (frameId) {
    case 'none':
      return { style: 'none', color: '#FFFFFF', width: 0 };
    case 'chalk-pink':
      return { style: 'chalk-plus', color: '#FFB3C8', width: 8 };
    case 'glow-silver':
      return { style: 'glow', color: '#E8E8EE', width: 8 };
    case 'chalk-white':
      return { style: 'chalk', color: '#FFFFFF', width: 9 };
    default:
      return { ...DEFAULT_TRACE };
  }
}

export function normalizeTrace(raw?: Partial<TraceSettings>, frameId?: LegacyFrameId): TraceSettings {
  if (raw?.style) {
    return {
      style: raw.style,
      color: raw.color ?? DEFAULT_TRACE.color,
      width: typeof raw.width === 'number' ? raw.width : DEFAULT_TRACE.width,
    };
  }
  return legacyTraceFromFrameId(frameId);
}
