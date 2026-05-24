import type { StickerCategory } from './types';

export const STICKER_CATEGORIES: { id: StickerCategory; label: string; emoji: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤' },
  { id: 'items', label: 'Items', emoji: '✨' },
  { id: 'people', label: 'People', emoji: '🧑' },
];

export function normalizeStickerCategory(raw?: string | null): StickerCategory {
  if (raw === 'food' || raw === 'drinks' || raw === 'items' || raw === 'people') return raw;
  return 'items';
}
