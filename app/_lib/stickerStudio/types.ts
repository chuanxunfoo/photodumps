export type FrameId =
  | 'none'
  | 'solid-white'
  | 'solid-pink'
  | 'solid-mint'
  | 'dashed-gold'
  | 'chalk-white'
  | 'chalk-pink'
  | 'glow-silver';

export type CutoutMethod = 'native' | 'removebg';

export type SavedSticker = {
  id: string;
  uri: string;
  frameId: FrameId;
  createdAt: number;
  sourceUri?: string;
};

export type PlacedCutout = {
  key: string;
  stickerId: string;
  uri: string;
  frameId: FrameId;
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
