import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FrameId, SavedSticker } from './types';

const KEY = '@photodumps_stickers_v1';

export async function loadStickers(): Promise<SavedSticker[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSticker[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export async function saveSticker(entry: Omit<SavedSticker, 'id' | 'createdAt'>): Promise<SavedSticker> {
  const list = await loadStickers();
  const sticker: SavedSticker = {
    ...entry,
    id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([sticker, ...list].slice(0, 48)));
  return sticker;
}

export async function deleteSticker(id: string): Promise<void> {
  const list = await loadStickers();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(s => s.id !== id)));
}

export async function updateStickerFrame(id: string, frameId: FrameId): Promise<void> {
  const list = await loadStickers();
  const next = list.map(s => (s.id === id ? { ...s, frameId } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
