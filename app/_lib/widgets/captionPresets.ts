import { Platform, type TextStyle } from 'react-native';

export type CaptionFontId = 'rounded' | 'serif' | 'hand' | 'mono';
export type CaptionColorId = 'ink' | 'rose' | 'lavender' | 'mint' | 'cream' | 'sky';

export const CAPTION_FONT_IDS: CaptionFontId[] = ['rounded', 'serif', 'hand', 'mono'];
export const CAPTION_COLOR_IDS: CaptionColorId[] = ['ink', 'rose', 'lavender', 'mint', 'cream', 'sky'];

const ios = Platform.OS === 'ios';

type CaptionFontSpec = {
  family?: string;
  weight: TextStyle['fontWeight'];
  fontStyle?: TextStyle['fontStyle'];
};

/** Safe system fonts — avoid invalid PostScript names that crash some iOS builds. */
export const CAPTION_FONTS: Record<CaptionFontId, CaptionFontSpec> = {
  rounded: { weight: '700' },
  serif: {
    family: ios ? 'Georgia' : 'serif',
    weight: '600',
    fontStyle: 'italic',
  },
  hand: {
    family: Platform.select({ ios: 'Snell Roundhand', android: undefined, default: undefined }),
    weight: '600',
    fontStyle: 'italic',
  },
  mono: {
    family: ios ? 'Menlo' : 'monospace',
    weight: '700',
  },
};

export const CAPTION_COLORS: Record<CaptionColorId, string> = {
  ink: '#2a2418',
  rose: '#c45c7a',
  lavender: '#7b6ba8',
  mint: '#3d8a72',
  cream: '#f5efe0',
  sky: '#4a7fad',
};

export const DEFAULT_CAPTION_FONT: CaptionFontId = 'rounded';
export const DEFAULT_CAPTION_COLOR: CaptionColorId = 'ink';

export function captionTextStyle(
  fontId: CaptionFontId = DEFAULT_CAPTION_FONT,
  colorId: CaptionColorId = DEFAULT_CAPTION_COLOR,
  fontSize = 15,
): TextStyle {
  const font = CAPTION_FONTS[fontId];
  const color = CAPTION_COLORS[colorId];
  const style: TextStyle = {
    fontSize,
    color,
    textAlign: 'center',
    lineHeight: Math.round(fontSize * 1.35),
  };

  if (font.family) {
    style.fontFamily = font.family;
    if (font.fontStyle) style.fontStyle = font.fontStyle;
  } else {
    style.fontWeight = font.weight;
  }

  if (colorId === 'cream') {
    style.textShadowColor = 'rgba(0,0,0,0.35)';
    style.textShadowOffset = { width: 0, height: 1 };
    style.textShadowRadius = 4;
  } else {
    style.textShadowColor = 'rgba(255,255,255,0.85)';
    style.textShadowOffset = { width: 0, height: 0 };
    style.textShadowRadius = 6;
  }

  return style;
}
