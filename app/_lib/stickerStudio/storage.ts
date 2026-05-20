import AsyncStorage from '@react-native-async-storage/async-storage';
import { legacyTraceFromFrameId, normalizeTrace } from './frameStroke';
import { persistStickerUri, stickerFileExists } from './stickerFiles';
import type { SavedSticker, TraceSettings } from './types';

const KEY = '@photodumps_stickers_v1';

function hydrateSticker(raw: SavedSticker): SavedSticker {
  return {
    ...raw,
    trace: normalizeTrace(raw.trace, raw.frameId),
  };
}

async function filterExistingStickers(list: SavedSticker[]): Promise<SavedSticker[]> {
  const checks = await Promise.all(list.map(s => stickerFileExists(s.uri)));
  return list.filter((_, i) => checks[i]);
}

export async function loadStickers(): Promise<SavedSticker[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSticker[];
    if (!Array.isArray(parsed)) return [];
    const hydrated = parsed.map(hydrateSticker).sort((a, b) => b.createdAt - a.createdAt);
    const existing = await filterExistingStickers(hydrated);
    if (existing.length !== hydrated.length) {
      await AsyncStorage.setItem(KEY, JSON.stringify(existing));
    }
    return existing;
  } catch {
    return [];
  }
}

export async function saveSticker(
  entry: Omit<SavedSticker, 'id' | 'createdAt'>,
): Promise<SavedSticker> {
  const list = await loadStickers();
  const persistedUri = await persistStickerUri(entry.uri);
  const sticker: SavedSticker = {
    ...entry,
    uri: persistedUri,
    trace: normalizeTrace(entry.trace, entry.frameId),
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

export async function updateStickerTrace(id: string, trace: TraceSettings): Promise<void> {
  const list = await loadStickers();
  const next = list.map(s => (s.id === id ? { ...s, trace: normalizeTrace(trace) } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
