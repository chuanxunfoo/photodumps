import * as FileSystem from 'expo-file-system/legacy';

const STICKER_SUBDIR = 'stickers/';

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

export function stickerDir(): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('NO_DOCUMENTS');
  return base.endsWith('/') ? `${base}${STICKER_SUBDIR}` : `${base}/${STICKER_SUBDIR}`;
}

/** Store only `stickers/st_*.png` in AsyncStorage so rebuilds keep working. */
export function toStoredStickerPath(uri: string): string {
  const plain = uri.replace(/^file:\/\//, '');
  const idx = plain.lastIndexOf(STICKER_SUBDIR);
  if (idx >= 0) return plain.slice(idx);
  const name = plain.split('/').pop();
  if (name?.startsWith('st_') && name.endsWith('.png')) return `${STICKER_SUBDIR}${name}`;
  if (name?.startsWith('co_') && name.endsWith('.png')) return `${STICKER_SUBDIR}${name}`;
  return plain;
}

/** Resolve stored path against the current app sandbox (fixes missing stickers after reinstall/rebuild). */
export function resolveStickerUri(stored: string): string {
  const t = stored?.trim();
  if (!t) return t;
  if (t.startsWith(STICKER_SUBDIR)) return withFileScheme(`${FileSystem.documentDirectory ?? ''}${t}`);
  const rel = toStoredStickerPath(t);
  if (rel.startsWith(STICKER_SUBDIR)) {
    return withFileScheme(`${FileSystem.documentDirectory ?? ''}${rel}`);
  }
  return withFileScheme(t);
}

export async function stickerFileExists(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  try {
    const resolved = resolveStickerUri(uri);
    const info = await FileSystem.getInfoAsync(resolved);
    return info.exists;
  } catch {
    return false;
  }
}

/** Copy tmp/cache sticker PNG into permanent app storage. */
export async function persistStickerUri(uri: string): Promise<string> {
  const src = withFileScheme(uri.trim());
  const dir = stickerDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}st_${Date.now()}.png`;
  await FileSystem.copyAsync({ from: src, to: withFileScheme(dest) });
  return toStoredStickerPath(dest);
}
