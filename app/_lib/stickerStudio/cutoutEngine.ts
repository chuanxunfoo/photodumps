import { Image, Platform } from 'react-native';
import Constants from 'expo-constants';
import { removeBgImage, BackgroundRemovalError } from 'rn-remove-image-bg';
import {
  CUTOUT_CLOUD_DIMENSION,
  CUTOUT_LIVE_DIMENSION,
  CUTOUT_MAX_DIMENSION,
  normalizePhotoForCutout,
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
        return 'Cloud cutout credits are used up. Rebuild with on-device cutout: npm run ios (Mac) or eas build --platform ios --profile development, then use start:dev-client — not Expo Go.';
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(binary);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    out += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] + chars[((b & 15) << 2) | (c >> 6)] + chars[c & 63];
  }
  return out;
}

type RemoveBgSize = 'preview' | 'small' | 'auto';

async function nativeSubjectCutout(
  uri: string,
  onProgress?: (pct: number) => void,
  maxDimension = 720,
): Promise<string> {
  try {
    return await removeBgImage(uri, {
      maxDimension,
      format: 'PNG',
      quality: 92,
      useCache: true,
      onProgress: n => onProgress?.(Math.round(n)),
    });
  } catch (err) {
    if (err instanceof BackgroundRemovalError) {
      throw new CutoutError(err.toUserMessage(), 'NATIVE_UNAVAILABLE');
    }
    throw err;
  }
}

async function removeBackgroundCloud(
  fileUri: string,
  apiKey: string,
  size: RemoveBgSize = 'preview',
): Promise<CutoutResult> {
  const form = new FormData();
  form.append('size', size);
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

  const base64 = arrayBufferToBase64(await res.arrayBuffer());
  const outPath = await writePngBase64(base64);
  const { width, height } = await imageSize(outPath);
  return { uri: outPath, width, height, method: 'removebg' };
}

/** Fast cloud path when API key is set (~2–8s with preview size). */
export async function tryCloudCutoutOnly(
  fileUri: string,
  onProgress?: CutoutProgress,
  size: RemoveBgSize = 'preview',
): Promise<CutoutResult | null> {
  const key = removeBgApiKey();
  if (!key) return null;
  onProgress?.(20, '');
  return tryCloudCutout(fileUri, onProgress, size);
}

async function tryCloudCutout(
  fileUri: string,
  onProgress?: CutoutProgress,
  size: RemoveBgSize = 'preview',
): Promise<CutoutResult | null> {
  const key = removeBgApiKey();
  if (!key) return null;
  try {
    onProgress?.(35, '');
    const cloud = await removeBackgroundCloud(fileUri, key, size);
    onProgress?.(100, '');
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
  return normalizePhotoForCutout(uri, maxDimension ?? CUTOUT_CLOUD_DIMENSION);
}

export async function prepareLiveScanPhoto(uri: string): Promise<string> {
  return normalizePhotoForCutout(uri, CUTOUT_LIVE_DIMENSION);
}

async function nativeCutoutResult(
  fileUri: string,
  onProgress?: CutoutProgress,
  maxDimension = 512,
): Promise<CutoutResult> {
  onProgress?.(12, '');
  const outUri = await nativeSubjectCutout(
    fileUri,
    pct => onProgress?.(12 + Math.round(pct * 0.82), ''),
    maxDimension,
  );
  const { width, height } = await imageSize(outUri);
  onProgress?.(100, '');
  return { uri: outUri, width, height, method: 'native' };
}

/**
 * Cut out from an already-resized JPEG (skips second normalize pass).
 * Dev builds: on-device Core ML / ML Kit first (~1–4s). Cloud is fallback only.
 */
export async function cutoutFromPreparedFile(
  fileUri: string,
  onProgress?: CutoutProgress,
  options?: { cloudSize?: RemoveBgSize; nativeMaxDimension?: number },
): Promise<CutoutResult> {
  const cloudSize = options?.cloudSize ?? 'preview';
  const nativeMax = options?.nativeMaxDimension ?? 512;
  const useNative = nativeCutoutBundled() && Platform.OS !== 'web';

  if (useNative) {
    try {
      return await nativeCutoutResult(fileUri, onProgress, nativeMax);
    } catch (nativeErr) {
      if (hasRemoveBgApiKey()) {
        try {
          const cloud = await tryCloudCutout(fileUri, onProgress, cloudSize);
          if (cloud) return cloud;
        } catch (cloudErr) {
          if (cloudErr instanceof CutoutError && cloudErr.code === 'RATE_LIMITED' && isExpoGo()) {
            throw new CutoutError('EXPO_GO_WASM', 'NATIVE_UNAVAILABLE');
          }
          if (cloudErr instanceof CutoutError) throw cloudErr;
        }
      }
      if (nativeErr instanceof CutoutError) throw nativeErr;
      throw new CutoutError(
        'Could not isolate the subject. Use one clear item with contrast against the background.',
        'NATIVE_UNAVAILABLE',
      );
    }
  }

  if (isExpoGo()) {
    throw new CutoutError('EXPO_GO_WASM', 'NATIVE_UNAVAILABLE');
  }

  const cloud = await tryCloudCutout(fileUri, onProgress, cloudSize);
  if (cloud) return cloud;

  throw new CutoutError(
    'Cutout unavailable. Add EXPO_PUBLIC_REMOVE_BG_API_KEY to app/.env or use npm run ios.',
    'NATIVE_UNAVAILABLE',
  );
}

/**
 * Detect and cut the main subject (transparent PNG).
 * @deprecated Prefer prepare + cutoutFromPreparedFile to avoid double resize.
 */
export async function extractSubject(uri: string, onProgress?: CutoutProgress): Promise<CutoutResult> {
  onProgress?.(2, '');
  let fileUri: string;
  try {
    fileUri = await normalizePhotoForCutout(uri, CUTOUT_MAX_DIMENSION);
    await imageSize(fileUri);
  } catch {
    throw new CutoutError(
      'Could not read the photo. Try Gallery instead of Camera, or pick the image again.',
      'INVALID_IMAGE',
    );
  }
  return cutoutFromPreparedFile(fileUri, onProgress, { cloudSize: 'small' });
}
