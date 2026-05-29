import AsyncStorage from '@react-native-async-storage/async-storage';
import { legacyTraceFromFrameId, normalizeTrace } from './frameStroke';
import { backupStickerLibraryFromStorage, restoreStickerLibraryIfNeeded } from './stickerBackup';
import { persistStickerUri, resolveStickerUri, stickerFileExists, toStoredStickerPath } from './stickerFiles';
import type { SavedSticker, TraceSettings } from './types';

const KEY = '@photodumps_stickers_v1';

function hydrateSticker(raw: SavedSticker): SavedSticker {
  return {
    ...raw,
    uri: resolveStickerUri(raw.uri),
    trace: normalizeTrace(raw.trace, raw.frameId),
  };
}

function toStorageRecord(s: SavedSticker): SavedSticker {
  return { ...s, uri: toStoredStickerPath(s.uri) };
}

async function filterExistingStickers(list: SavedSticker[]): Promise<SavedSticker[]> {
  const checks = await Promise.all(list.map(s => stickerFileExists(s.uri)));
  return list.filter((_, i) => checks[i]);
}

export async function loadStickers(): Promise<SavedSticker[]> {
  try {
    let raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      await restoreStickerLibraryIfNeeded();
      raw = await AsyncStorage.getItem(KEY);
    }
    if (!raw) return [];

    const parsed = JSON.parse(raw) as SavedSticker[];
    if (!Array.isArray(parsed)) return [];

    const hydrated = parsed.map(hydrateSticker).sort((a, b) => b.createdAt - a.createdAt);
    let existing = await filterExistingStickers(hydrated);

    if (existing.length === 0 && hydrated.length > 0) {
      const restored = await restoreStickerLibraryIfNeeded();
      if (restored) return loadStickers();
    }

    const storageRecords = existing.map(toStorageRecord);
    const parsedRecords = hydrated.map(toStorageRecord);
    const needsRewrite =
      storageRecords.length !== parsedRecords.length ||
      storageRecords.some((s, i) => s.uri !== parsedRecords[i]?.uri);
    if (needsRewrite) {
      await AsyncStorage.setItem(KEY, JSON.stringify(storageRecords));
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
  const storedPath = await persistStickerUri(entry.uri);
  const sticker: SavedSticker = {
    ...entry,
    uri: resolveStickerUri(storedPath),
    trace: normalizeTrace(entry.trace, entry.frameId),
    id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [sticker, ...list.filter(s => s.id !== sticker.id)].slice(0, 48);
  await AsyncStorage.setItem(KEY, JSON.stringify(next.map(toStorageRecord)));
  void backupStickerLibraryFromStorage();
  return sticker;
}

export async function deleteSticker(id: string): Promise<void> {
  const list = await loadStickers();
  const next = list.filter(s => s.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next.map(toStorageRecord)));
  void backupStickerLibraryFromStorage();
}

export async function updateStickerTrace(id: string, trace: TraceSettings): Promise<void> {
  const list = await loadStickers();
  const next = list.map(s => (s.id === id ? { ...s, trace: normalizeTrace(trace) } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next.map(toStorageRecord)));
  void backupStickerLibraryFromStorage();
}
