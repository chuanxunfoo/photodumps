import * as FileSystem from 'expo-file-system/legacy';

const STICKER_DIR = `${FileSystem.documentDirectory ?? ''}stickers/`;

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

export async function stickerFileExists(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  try {
    const info = await FileSystem.getInfoAsync(withFileScheme(uri));
    return info.exists;
  } catch {
    return false;
  }
}

/** Copy tmp/cache sticker PNG into permanent app storage. */
export async function persistStickerUri(uri: string): Promise<string> {
  const src = withFileScheme(uri.trim());
  await FileSystem.makeDirectoryAsync(STICKER_DIR, { intermediates: true });
  const dest = `${STICKER_DIR}st_${Date.now()}.png`;
  await FileSystem.copyAsync({ from: src, to: dest });
  return withFileScheme(dest);
}
