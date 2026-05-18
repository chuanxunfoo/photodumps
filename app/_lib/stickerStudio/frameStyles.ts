import type { FrameId } from './types';
import type { ViewStyle } from 'react-native';

export type FrameOption = {
  id: FrameId;
  label: string;
  previewColor: string;
};

export const FRAME_OPTIONS: FrameOption[] = [
  { id: 'none', label: 'Plain', previewColor: 'transparent' },
  { id: 'solid-white', label: 'Solid', previewColor: '#FFFFFF' },
  { id: 'solid-pink', label: 'Pink', previewColor: '#FF6B9D' },
  { id: 'solid-mint', label: 'Mint', previewColor: '#5EEAD4' },
  { id: 'dashed-gold', label: 'Dashed', previewColor: '#FFD54F' },
  { id: 'chalk-white', label: 'Chalk', previewColor: '#F8F8F8' },
  { id: 'chalk-pink', label: 'Chalk+', previewColor: '#FF8FAB' },
  { id: 'glow-silver', label: 'Glow', previewColor: '#C0C0C8' },
];

export function frameOuterStyle(frameId: FrameId): ViewStyle {
  switch (frameId) {
    case 'none':
      return { backgroundColor: 'transparent' };
    case 'solid-white':
      return {
        backgroundColor: '#FFFFFF',
        padding: 10,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      };
    case 'solid-pink':
      return {
        backgroundColor: '#FF6B9D',
        padding: 10,
        borderRadius: 8,
        shadowColor: '#FF2D78',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
      };
    case 'solid-mint':
      return {
        backgroundColor: '#5EEAD4',
        padding: 9,
        borderRadius: 10,
        shadowColor: '#00C9A7',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      };
    case 'dashed-gold':
      return {
        padding: 8,
        borderRadius: 4,
        borderWidth: 3,
        borderStyle: 'dashed',
        borderColor: '#FFD54F',
        backgroundColor: 'rgba(255,213,79,0.12)',
      };
    case 'chalk-white':
      return {
        padding: 12,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.9,
        shadowRadius: 0,
        shadowOffset: { width: -3, height: -2 },
        elevation: 4,
      };
    case 'chalk-pink':
      return {
        padding: 11,
        borderRadius: 6,
        backgroundColor: '#FFB3C8',
        shadowColor: '#FF6B9D',
        shadowOpacity: 0.55,
        shadowRadius: 6,
        shadowOffset: { width: 2, height: 3 },
        elevation: 5,
      };
    case 'glow-silver':
      return {
        padding: 9,
        borderRadius: 8,
        backgroundColor: '#E8E8EE',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#AAA',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 7,
      };
    default:
      return {};
  }
}

/** Extra chalk scribble offsets behind the cutout. */
export function chalkLayers(frameId: FrameId): ViewStyle[] {
  if (frameId === 'chalk-white') {
    return [
      { position: 'absolute', top: -4, left: -5, right: 5, bottom: 4, backgroundColor: '#FFF', borderRadius: 6, opacity: 0.85, transform: [{ rotate: '-2deg' }] },
      { position: 'absolute', top: 3, left: 4, right: -4, bottom: -3, backgroundColor: '#F0F0F0', borderRadius: 5, opacity: 0.7, transform: [{ rotate: '1.5deg' }] },
    ];
  }
  if (frameId === 'chalk-pink') {
    return [
      { position: 'absolute', top: -3, left: -4, right: 4, bottom: 3, backgroundColor: '#FFC2D4', borderRadius: 8, opacity: 0.9, transform: [{ rotate: '-1.8deg' }] },
      { position: 'absolute', top: 4, left: 5, right: -5, bottom: -4, backgroundColor: '#FF8FAB', borderRadius: 6, opacity: 0.55, transform: [{ rotate: '2deg' }] },
    ];
  }
  return [];
}
