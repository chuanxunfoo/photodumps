import type { ImageSourcePropType } from 'react-native';

/** Normalized 0–1 rect on template image (empty area for stickers). */
export type PlacementZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WidgetPlacementMode = 'free' | 'zones';

export type WidgetTemplate = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  /** width / height */
  aspectRatio: number;
  placementMode: WidgetPlacementMode;
  zones?: PlacementZone[];
  maxStickers: number;
  captionEnabled: boolean;
};

export type WidgetPlacedSticker = {
  key: string;
  stickerId: string;
  uri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

import type { CaptionColorId, CaptionFontId } from './captionPresets';

export type WidgetCaption = {
  text: string;
  /** Normalized center X on canvas */
  nx: number;
  /** Normalized center Y */
  ny: number;
  fontSize: number;
  fontId?: CaptionFontId;
  colorId?: CaptionColorId;
};

export type SavedWidget = {
  id: string;
  templateId: string;
  /** Permanent PNG in app documents — used in-app and by the home screen widget extension. */
  previewUri: string;
  stickers: WidgetPlacedSticker[];
  caption?: WidgetCaption;
  createdAt: number;
};
