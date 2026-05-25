import { Platform, type TextStyle } from 'react-native';
import type { CaptionSlant, CaptionWeight, WidgetCaption } from './types';

export type CaptionFontId =
  | 'rounded'
  | 'serif'
  | 'hand'
  | 'script'
  | 'marker'
  | 'typewriter'
  | 'bubble';

export type CaptionColorId =
  | 'ink'
  | 'rose'
  | 'blush'
  | 'lavender'
  | 'lilac'
  | 'mint'
  | 'sage'
  | 'sky'
  | 'butter'
  | 'peach'
  | 'cream'
  | 'mauve';

export const CAPTION_FONT_IDS: CaptionFontId[] = [
  'rounded',
  'serif',
  'hand',
  'script',
  'marker',
  'typewriter',
  'bubble',
];

export const CAPTION_COLOR_IDS: CaptionColorId[] = [
  'ink',
  'rose',
  'blush',
  'lavender',
  'lilac',
  'mint',
  'sage',
  'sky',
  'butter',
  'peach',
  'cream',
  'mauve',
];

export const CAPTION_WEIGHTS: CaptionWeight[] = ['400', '500', '600', '700', '800'];
export const CAPTION_SLANTS: CaptionSlant[] = ['normal', 'italic'];

const ios = Platform.OS === 'ios';

type CaptionFontSpec = {
  family?: string;
  defaultWeight: CaptionWeight;
  defaultSlant: CaptionSlant;
};

export const CAPTION_FONTS: Record<CaptionFontId, CaptionFontSpec> = {
  rounded: { defaultWeight: '700', defaultSlant: 'normal' },
  serif: {
    family: ios ? 'Georgia' : 'serif',
    defaultWeight: '600',
    defaultSlant: 'italic',
  },
  hand: {
    family: Platform.select({ ios: 'Snell Roundhand', default: undefined }),
    defaultWeight: '600',
    defaultSlant: 'italic',
  },
  script: {
    family: Platform.select({ ios: 'Bradley Hand', default: undefined }),
    defaultWeight: '600',
    defaultSlant: 'italic',
  },
  marker: {
    family: Platform.select({ ios: 'Marker Felt', default: undefined }),
    defaultWeight: '700',
    defaultSlant: 'normal',
  },
  typewriter: {
    family: ios ? 'Courier New' : 'monospace',
    defaultWeight: '600',
    defaultSlant: 'normal',
  },
  bubble: { defaultWeight: '800', defaultSlant: 'normal' },
};

export const CAPTION_COLORS: Record<CaptionColorId, string> = {
  ink: '#3d3648',
  rose: '#d4738f',
  blush: '#f4a4b8',
  lavender: '#9b8ec4',
  lilac: '#c4b5fd',
  mint: '#6eb89a',
  sage: '#8faf9a',
  sky: '#7eb0d4',
  butter: '#e8c87a',
  peach: '#f0b49a',
  cream: '#faf6ee',
  mauve: '#b07a9a',
};

export const DEFAULT_CAPTION_FONT: CaptionFontId = 'rounded';
export const DEFAULT_CAPTION_COLOR: CaptionColorId = 'ink';
export const DEFAULT_CAPTION_WEIGHT: CaptionWeight = '700';
export const DEFAULT_CAPTION_SLANT: CaptionSlant = 'normal';

export function captionTextStyle(
  fontId: CaptionFontId = DEFAULT_CAPTION_FONT,
  colorId: CaptionColorId = DEFAULT_CAPTION_COLOR,
  fontSize = 15,
  fontWeight?: CaptionWeight,
  fontSlant?: CaptionSlant,
): TextStyle {
  const font = CAPTION_FONTS[fontId];
  const color = CAPTION_COLORS[colorId];
  const weight = fontWeight ?? font.defaultWeight;
  const slant = fontSlant ?? font.defaultSlant;

  const style: TextStyle = {
    fontSize,
    color,
    textAlign: 'center',
    lineHeight: Math.round(fontSize * 1.38),
    fontWeight: weight,
    fontStyle: slant,
  };

  if (font.family) {
    style.fontFamily = font.family;
  }

  if (fontId === 'bubble') {
    style.letterSpacing = 0.4;
  }

  if (colorId === 'cream' || colorId === 'butter') {
    style.textShadowColor = 'rgba(0,0,0,0.28)';
    style.textShadowOffset = { width: 0, height: 1 };
    style.textShadowRadius = 3;
  } else {
    style.textShadowColor = 'rgba(255,255,255,0.75)';
    style.textShadowOffset = { width: 0, height: 0 };
    style.textShadowRadius = 5;
  }

  return style;
}

export function captionStyleFromWidget(caption: WidgetCaption): TextStyle {
  return captionTextStyle(
    caption.fontId,
    caption.colorId,
    caption.fontSize,
    caption.fontWeight,
    caption.fontSlant,
  );
}
