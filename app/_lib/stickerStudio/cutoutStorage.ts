import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupStickerLibraryFromStorage } from './stickerBackup';
import { persistStickerUri, resolveStickerUri, stickerFileExists, toStoredStickerPath } from './stickerFiles';

export type SavedCutout = {
  id: string;
  uri: string;
  createdAt: number;
  width?: number;
  height?: number;
};

const KEY = '@photodumps_cutouts_v1';
const MAX = 64;

export async function loadCutouts(): Promise<SavedCutout[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCutout[];
    if (!Array.isArray(parsed)) return [];
    const sorted = parsed
      .map(c => ({ ...c, uri: resolveStickerUri(c.uri) }))
      .sort((a, b) => b.createdAt - a.createdAt);
    const checks = await Promise.all(sorted.map(c => stickerFileExists(c.uri)));
    return sorted.filter((_, i) => checks[i]);
  } catch {
    return [];
  }
}

export async function saveCutout(
  entry: Omit<SavedCutout, 'id' | 'createdAt'>,
): Promise<SavedCutout> {
  const list = await loadCutouts();
  const storedPath = await persistStickerUri(entry.uri);
  const item: SavedCutout = {
    ...entry,
    uri: resolveStickerUri(storedPath),
    id: `co_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [item, ...list.filter(c => c.id !== item.id)].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next.map(c => ({ ...c, uri: toStoredStickerPath(c.uri) }))));
  void backupStickerLibraryFromStorage();
  return item;
}

export async function deleteCutout(id: string): Promise<void> {
  const list = await loadCutouts();
  const next = list.filter(c => c.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next.map(c => ({ ...c, uri: toStoredStickerPath(c.uri) }))));
  void backupStickerLibraryFromStorage();
}
