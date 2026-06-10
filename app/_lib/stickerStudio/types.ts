/** Silhouette trace style — chalk / chalk+ / toon / glow. */
export type TraceStyle = 'none' | 'chalk' | 'chalk-plus' | 'toon' | 'glow';

export type TraceSettings = {
  style: TraceStyle;
  /** Stroke colour (hex). */
  color: string;
  /** Outline thickness in px (offset radius). */
  width: number;
  /** Extra dashed ring around the shape — independent of style (White / Toon / etc.). */
  dashWrap?: boolean;
};

/** @deprecated Old stickers may still have frameId in storage. */
export type LegacyFrameId =
  | 'none'
  | 'solid-white'
  | 'solid-pink'
  | 'solid-mint'
  | 'dashed-gold'
  | 'chalk-white'
  | 'chalk-pink'
  | 'glow-silver';

export type CutoutMethod = 'native' | 'removebg' | 'wasm' | 'imported';

export type StickerCategory = 'food' | 'drinks' | 'items' | 'people';

export type SavedSticker = {
  id: string;
  uri: string;
  trace: TraceSettings;
  createdAt: number;
  category?: StickerCategory;
  sourceUri?: string;
  /** @deprecated migrated on load */
  frameId?: LegacyFrameId;
};

export type PlacedCutout = {
  key: string;
  stickerId: string;
  uri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type CutoutResult = {
  uri: string;
  width: number;
  height: number;
  method: CutoutMethod;
};

export const DEFAULT_TRACE: TraceSettings = {
  style: 'toon',
  color: '#FFFFFF',
  width: 9,
  dashWrap: false,
};
