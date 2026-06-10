import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export type VideoImportProgress = {
  /** 0–1 */
  fraction: number;
  label: string;
};

export function isLikelyICloudErrorMessage(msg: string): boolean {
  return /3164/i.test(msg) || /networkAccessRequired/i.test(msg) || /PHPhotosErrorDomain/i.test(msg) || /icloud/i.test(msg);
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function fileReady(uri: string): Promise<boolean> {
  if (!uri.startsWith('file://')) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return Boolean(info.exists && (info.size ?? 0) > 4096);
  } catch {
    return false;
  }
}

/**
 * Materialize a gallery video locally (iCloud-aware). Fast polls first, then short backoff.
 */
export async function resolveLocalVideoUri(
  assetId: string,
  opts?: {
    maxWaitMs?: number;
    onProgress?: (p: VideoImportProgress) => void;
  },
): Promise<string | null> {
  const maxWaitMs = opts?.maxWaitMs ?? 12_000;
  const started = Date.now();

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted' && status !== 'limited') return null;
  } catch {
    return null;
  }

  let attempt = 0;
  while (Date.now() - started < maxWaitMs) {
    attempt += 1;
    const elapsed = Date.now() - started;
    const fraction = Math.min(0.95, elapsed / maxWaitMs);
    opts?.onProgress?.({
      fraction,
      label: fraction < 0.25
        ? 'Checking video…'
        : fraction < 0.55
          ? 'Downloading from iCloud…'
          : 'Almost ready…',
    });

    try {
      const info = await MediaLibrary.getAssetInfoAsync(assetId, {
        shouldDownloadFromNetwork: true,
      });
      const candidates = [info.localUri, info.uri].filter(
        (u): u is string => typeof u === 'string' && u.length > 0,
      );
      for (const uri of candidates) {
        if (await fileReady(uri)) return uri;
        if (uri.startsWith('file://')) return uri;
      }
    } catch {
      /* retry */
    }

    const delay = attempt <= 6 ? 180 + attempt * 80 : 400 + attempt * 120;
    await sleep(Math.min(delay, maxWaitMs - elapsed));
  }

  opts?.onProgress?.({ fraction: 1, label: 'Finishing…' });
  return null;
}

/** Copy to app cache when possible; returns cache path or original file URI. */
export async function cacheVideoForTrim(
  sourceUri: string,
  assetId: string | null,
  onProgress?: (p: VideoImportProgress) => void,
): Promise<string | null> {
  onProgress?.({ fraction: 0.08, label: 'Preparing video…' });

  if (await fileReady(sourceUri)) {
    const base = FileSystem.cacheDirectory;
    const dest = base ? `${base}trim_${Date.now()}.mp4` : null;
    if (dest) {
      try {
        await FileSystem.copyAsync({ from: sourceUri, to: dest });
        onProgress?.({ fraction: 1, label: 'Ready' });
        return dest;
      } catch {
        onProgress?.({ fraction: 1, label: 'Ready' });
        return sourceUri;
      }
    }
    onProgress?.({ fraction: 1, label: 'Ready' });
    return sourceUri;
  }

  if (assetId) {
    const local = await resolveLocalVideoUri(assetId, {
      maxWaitMs: 14_000,
      onProgress: (p) => onProgress?.({
        fraction: 0.12 + p.fraction * 0.82,
        label: p.label,
      }),
    });
    if (local && (await fileReady(local) || local.startsWith('file://'))) {
      const base = FileSystem.cacheDirectory;
      const dest = base ? `${base}trim_${Date.now()}.mp4` : null;
      if (dest && local.startsWith('file://')) {
        try {
          await FileSystem.copyAsync({ from: local, to: dest });
          onProgress?.({ fraction: 1, label: 'Ready' });
          return dest;
        } catch {
          onProgress?.({ fraction: 1, label: 'Ready' });
          return local;
        }
      }
      onProgress?.({ fraction: 1, label: 'Ready' });
      return local;
    }
  }

  if (await fileReady(sourceUri)) {
    onProgress?.({ fraction: 1, label: 'Ready' });
    return sourceUri;
  }

  return null;
}
