import { Image, Platform } from 'react-native';
import Constants from 'expo-constants';
import { removeBgImage, BackgroundRemovalError } from 'rn-remove-image-bg';
import {
  CUTOUT_LIVE_DIMENSION,
  normalizePhotoForCutout,
  readPhotoBase64,
  resolveReadableFileUri,
  writePngBase64,
} from '../photoFile';
import { isExpoGo, nativeCutoutBundled } from './runtime';
import type { CutoutResult, CutoutMethod } from './types';

export class CutoutError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NATIVE_UNAVAILABLE'
      | 'CLOUD_FAILED'
      | 'RATE_LIMITED'
      | 'INVALID_IMAGE' = 'NATIVE_UNAVAILABLE',
  ) {
    super(message);
    this.name = 'CutoutError';
  }
}

/** User-facing alert body (no raw API dumps). */
export function cutoutErrorMessage(err: unknown): string {
  if (err instanceof CutoutError) {
    if (err.message === 'EXPO_GO_WASM') {
      return 'Use on-device cutout in Expo Go.';
    }
    if (err.code === 'RATE_LIMITED') {
      return 'Cloud cutout is temporarily busy. We switched to on-device AI — try again, or wait a minute and retry.';
    }
    if (err.code === 'CLOUD_FAILED') {
      if (err.message.toLowerCase().includes('credit')) {
        return 'Cloud cutout credits are used up. Use a dev build (npm run ios / android) for free on-device cutout, or add remove.bg credits.';
      }
      return err.message.replace(/^Cloud cutout failed:\s*/i, '') || 'Cloud cutout failed. Try again with Wi‑Fi.';
    }
    return err.message;
  }
  return 'Use one clear subject with contrast against the background.';
}

export type CutoutProgress = (percent: number, stage: string) => void;

export function hasRemoveBgApiKey(): boolean {
  return Boolean(removeBgApiKey());
}

function removeBgApiKey(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const key =
    extra?.EXPO_PUBLIC_REMOVE_BG_API_KEY ??
    process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;
  if (!key || key === 'your_key_here' || key.includes('paste_your')) return undefined;
  return key.trim();
}

async function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function nativeSubjectCutout(
  uri: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  try {
    return await removeBgImage(uri, {
      maxDimension: 1024,
      format: 'PNG',
      quality: 100,
      useCache: false,
      onProgress: n => onProgress?.(Math.round(n)),
    });
  } catch (err) {
    if (err instanceof BackgroundRemovalError) {
      throw new CutoutError(err.toUserMessage(), 'NATIVE_UNAVAILABLE');
    }
    throw err;
  }
}

async function removeBackgroundCloud(fileUri: string, apiKey: string): Promise<CutoutResult> {
  const form = new FormData();
  form.append('size', 'auto');
  form.append('format', 'png');
  form.append('type', 'auto');
  form.append('image_file', {
    uri: fileUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new CutoutError('Cloud cutout rate limit reached. Try again in a minute.', 'RATE_LIMITED');
    }
    const hint =
      res.status === 403
        ? 'Invalid remove.bg API key.'
        : res.status === 402
          ? 'remove.bg credits used up.'
          : detail.slice(0, 80) || `HTTP ${res.status}`;
    throw new CutoutError(`Cloud cutout failed: ${hint}`, 'CLOUD_FAILED');
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  let base64 = '';
  if (typeof globalThis.btoa === 'function') {
    base64 = globalThis.btoa(binary);
  } else {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i]!;
      const b = bytes[i + 1] ?? 0;
      const c = bytes[i + 2] ?? 0;
      base64 += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] + chars[((b & 15) << 2) | (c >> 6)] + chars[c & 63];
    }
  }

  const outPath = await writePngBase64(base64);
  const { width, height } = await imageSize(outPath);
  return { uri: outPath, width, height, method: 'removebg' };
}

/** Fast cloud path when API key is set (~5–15s). Throws on rate limit / auth errors. */
export async function tryCloudCutoutOnly(
  fileUri: string,
  onProgress?: CutoutProgress,
): Promise<CutoutResult | null> {
  const key = removeBgApiKey();
  if (!key) return null;
  onProgress?.(15, 'Cloud cutout (fast)…');
  return tryCloudCutout(fileUri, onProgress);
}

async function tryCloudCutout(fileUri: string, onProgress?: CutoutProgress): Promise<CutoutResult | null> {
  const key = removeBgApiKey();
  if (!key) return null;
  try {
    onProgress?.(30, 'Tracing your subject…');
    const cloud = await removeBackgroundCloud(fileUri, key);
    onProgress?.(100, 'Done');
    return cloud;
  } catch (err) {
    if (err instanceof CutoutError) throw err;
    return null;
  }
}

export function cutoutMethodLabel(_method: CutoutMethod): string {
  return '';
}

/** Prepare picker/camera URI for any cutout backend. */
export async function preparePhotoUri(uri: string, maxDimension?: number): Promise<string> {
  return normalizePhotoForCutout(uri, maxDimension);
}

export async function prepareLiveScanPhoto(uri: string): Promise<string> {
  return normalizePhotoForCutout(uri, CUTOUT_LIVE_DIMENSION);
}

/**
 * Detect and cut the main subject (transparent PNG).
 */
export async function extractSubject(uri: string, onProgress?: CutoutProgress): Promise<CutoutResult> {
  onProgress?.(2, 'Preparing photo');
  let fileUri: string;
  try {
    fileUri = await normalizePhotoForCutout(uri);
    await imageSize(fileUri);
  } catch {
    throw new CutoutError(
      'Could not read the photo. Try Gallery instead of Camera, or pick the image again.',
      'INVALID_IMAGE',
    );
  }

  onProgress?.(8, 'Finding main subject');

  const useNative = nativeCutoutBundled() && Platform.OS !== 'web';

  if (!useNative) {
    if (isExpoGo()) {
      throw new CutoutError('EXPO_GO_WASM', 'NATIVE_UNAVAILABLE');
    }

    const cloud = await tryCloudCutout(fileUri, onProgress);
    if (cloud) return cloud;

    throw new CutoutError(
      'Cutout unavailable. Add EXPO_PUBLIC_REMOVE_BG_API_KEY to app/.env or use npm run android.',
      'NATIVE_UNAVAILABLE',
    );
  }

  try {
    onProgress?.(12, Platform.OS === 'android' ? 'Loading ML model…' : 'Tracing edges…');
    const outUri = await nativeSubjectCutout(fileUri, pct => {
      onProgress?.(12 + Math.round(pct * 0.78), 'Cutting out subject');
    });
    const { width, height } = await imageSize(outUri);
    onProgress?.(100, 'Done');
    return { uri: outUri, width, height, method: 'native' };
  } catch (nativeErr) {
    try {
      const cloud = await tryCloudCutout(fileUri, onProgress);
      if (cloud) return cloud;
    } catch (cloudErr) {
      if (cloudErr instanceof CutoutError && cloudErr.code === 'RATE_LIMITED' && isExpoGo()) {
        throw new CutoutError('EXPO_GO_WASM', 'NATIVE_UNAVAILABLE');
      }
      if (cloudErr instanceof CutoutError) throw cloudErr;
    }

    if (nativeErr instanceof CutoutError) throw nativeErr;

    throw new CutoutError(
      'Could not isolate the subject. Use one clear item with contrast against the background.',
      'NATIVE_UNAVAILABLE',
    );
  }
}
