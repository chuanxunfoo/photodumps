import type { ImageSourcePropType } from 'react-native';
import type { WidgetFamily } from './widgetSizes';

export type WidgetTemplateKind = 'full' | 'cutout';

export type WidgetTemplate = {
  id: string;
  name: string;
  kind: WidgetTemplateKind;
  /** iOS widget sizes this template supports */
  families: WidgetFamily[];
  /** PNG per family — exact iOS aspect, transparent outside cutout art */
  images: Record<WidgetFamily, ImageSourcePropType>;
  placementMode: 'free';
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

export type CaptionWeight = '400' | '500' | '600' | '700' | '800';
export type CaptionSlant = 'normal' | 'italic';

export type WidgetCaption = {
  text: string;
  nx: number;
  ny: number;
  fontSize: number;
  fontId?: CaptionFontId;
  colorId?: CaptionColorId;
  fontWeight?: CaptionWeight;
  fontSlant?: CaptionSlant;
};

export type SavedWidget = {
  id: string;
  templateId: string;
  family: WidgetFamily;
  kind: WidgetTemplateKind;
  previewUri: string;
  stickers: WidgetPlacedSticker[];
  caption?: WidgetCaption;
  createdAt: number;
  updatedAt?: number;
};
