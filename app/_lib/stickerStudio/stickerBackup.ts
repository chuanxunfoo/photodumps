import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { WIDGET_APP_GROUP } from '../widgets/constants';
import { resolveStickerUri, stickerDir, stickerFileExists, toStoredStickerPath } from './stickerFiles';

const STICKER_SUBDIR = 'stickers/';
import type { SavedSticker } from './types';

const STICKERS_KEY = '@photodumps_stickers_v1';
const CUTOUTS_KEY = '@photodumps_cutouts_v1';
const BACKUP_INDEX = 'stickers/index.json';

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

function sharedStickersDir(): string | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const base = Paths.appleSharedContainers[WIDGET_APP_GROUP]?.uri;
    if (!base) return null;
    return `${base.replace(/\/$/, '')}/stickers-backup/`;
  } catch {
    return null;
  }
}

type BackupPayload = {
  version: 1;
  updatedAt: number;
  stickers: SavedSticker[];
  cutouts: { id: string; uri: string; createdAt: number; width?: number; height?: number }[];
};

async function readBackup(): Promise<BackupPayload | null> {
  const dir = sharedStickersDir();
  if (!dir) return null;
  const indexUri = withFileScheme(`${dir}${BACKUP_INDEX}`);
  try {
    const info = await FileSystem.getInfoAsync(indexUri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(indexUri);
    const parsed = JSON.parse(raw) as BackupPayload;
    if (parsed?.version !== 1 || !Array.isArray(parsed.stickers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Mirror sticker PNGs + index into the App Group (survives many dev rebuilds better than stale absolute paths). */
export async function backupStickerLibrary(
  stickers: SavedSticker[],
  cutouts: { id: string; uri: string; createdAt: number; width?: number; height?: number }[],
): Promise<void> {
  const dir = sharedStickersDir();
  if (!dir) return;

  const filesDir = `${dir}files/`;
  await FileSystem.makeDirectoryAsync(filesDir, { intermediates: true });

  const backedStickers: SavedSticker[] = [];
  for (const s of stickers) {
    const resolved = resolveStickerUri(s.uri);
    if (!(await stickerFileExists(resolved))) continue;
    const name = toStoredStickerPath(resolved).replace(STICKER_SUBDIR, '');
    const dest = `${filesDir}${name}`;
    try {
      await FileSystem.copyAsync({ from: resolved, to: withFileScheme(dest) });
      backedStickers.push({ ...s, uri: `${STICKER_SUBDIR}${name}` });
    } catch {
      /* skip */
    }
  }

  const backedCutouts: BackupPayload['cutouts'] = [];
  for (const c of cutouts) {
    const resolved = resolveStickerUri(c.uri);
    if (!(await stickerFileExists(resolved))) continue;
    const name = toStoredStickerPath(resolved).replace(STICKER_SUBDIR, '');
    const dest = `${filesDir}${name}`;
    try {
      await FileSystem.copyAsync({ from: resolved, to: withFileScheme(dest) });
      backedCutouts.push({ ...c, uri: `${STICKER_SUBDIR}${name}` });
    } catch {
      /* skip */
    }
  }

  const payload: BackupPayload = {
    version: 1,
    updatedAt: Date.now(),
    stickers: backedStickers,
    cutouts: backedCutouts,
  };
  await FileSystem.writeAsStringAsync(withFileScheme(`${dir}${BACKUP_INDEX}`), JSON.stringify(payload));
}

/** Restore stickers when Documents were wiped but App Group backup remains. */
export async function restoreStickerLibraryIfNeeded(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STICKERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSticker[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const checks = await Promise.all(
          parsed.map(s => stickerFileExists(resolveStickerUri(s.uri))),
        );
        if (checks.some(Boolean)) return false;
      }
    }
  } catch {
    /* continue to restore */
  }

  const backup = await readBackup();
  if (!backup || backup.stickers.length === 0) return false;

  const dir = stickerDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const filesDir = sharedStickersDir();
  if (!filesDir) return false;

  const restored: SavedSticker[] = [];
  for (const s of backup.stickers) {
    const name = toStoredStickerPath(s.uri).replace('stickers/', '');
    const src = withFileScheme(`${filesDir}files/${name}`);
    try {
      const info = await FileSystem.getInfoAsync(src);
      if (!info.exists) continue;
      const dest = `${dir}${name}`;
      await FileSystem.copyAsync({ from: src, to: withFileScheme(dest) });
      restored.push({ ...s, uri: `stickers/${name}` });
    } catch {
      /* skip */
    }
  }

  if (restored.length === 0) return false;

  await AsyncStorage.setItem(STICKERS_KEY, JSON.stringify(restored));
  if (backup.cutouts.length > 0) {
    const cutRestored = [];
    for (const c of backup.cutouts) {
      const name = toStoredStickerPath(c.uri).replace('stickers/', '');
      const src = withFileScheme(`${filesDir}files/${name}`);
      try {
        const info = await FileSystem.getInfoAsync(src);
        if (!info.exists) continue;
        const dest = `${dir}${name}`;
        await FileSystem.copyAsync({ from: src, to: withFileScheme(dest) });
        cutRestored.push({ ...c, uri: `stickers/${name}` });
      } catch {
        /* skip */
      }
    }
    if (cutRestored.length > 0) {
      await AsyncStorage.setItem(CUTOUTS_KEY, JSON.stringify(cutRestored));
    }
  }
  return true;
}

/** Snapshot current AsyncStorage indexes into the App Group. */
export async function backupStickerLibraryFromStorage(): Promise<void> {
  try {
    const stickersRaw = await AsyncStorage.getItem(STICKERS_KEY);
    const cutoutsRaw = await AsyncStorage.getItem(CUTOUTS_KEY);
    const stickers = stickersRaw ? (JSON.parse(stickersRaw) as SavedSticker[]) : [];
    const cutouts = cutoutsRaw
      ? (JSON.parse(cutoutsRaw) as BackupPayload['cutouts'])
      : [];
    if (!Array.isArray(stickers)) return;
    await backupStickerLibrary(
      stickers.map(s => ({ ...s, uri: resolveStickerUri(s.uri) })),
      Array.isArray(cutouts) ? cutouts.map(c => ({ ...c, uri: resolveStickerUri(c.uri) })) : [],
    );
  } catch {
    /* best-effort */
  }
}
