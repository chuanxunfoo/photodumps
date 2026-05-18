import * as FileSystem from 'expo-file-system';
import { Image, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { CutoutResult, CutoutMethod } from './types';

export class CutoutError extends Error {
  constructor(
    message: string,
    readonly code: 'NATIVE_UNAVAILABLE' | 'CLOUD_FAILED' | 'INVALID_IMAGE' = 'NATIVE_UNAVAILABLE',
  ) {
    super(message);
    this.name = 'CutoutError';
  }
}

export type CutoutProgress = (percent: number, stage: string) => void;

function removeBgApiKey(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return (
    extra?.EXPO_PUBLIC_REMOVE_BG_API_KEY ??
    process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY
  );
}

async function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/** Ensure a local file:// URI for native ML (camera / picker paths). */
async function ensureFileUri(uri: string): Promise<string> {
  if (uri.startsWith('file://')) return uri;
  if (uri.startsWith('content://') || uri.startsWith('ph://')) {
    const dest = `${FileSystem.cacheDirectory}cutout_src_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

/**
 * On-device subject segmentation — iOS Vision / Android ML Kit.
 * Isolates food, drinks, people, objects (not the full frame).
 */
async function nativeSubjectCutout(
  uri: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mod = await import('rn-remove-image-bg');

  try {
    const out = await mod.removeBgImage(uri, {
      maxDimension: 1536,
      format: 'PNG',
      quality: 100,
      useCache: false,
      onProgress: n => onProgress?.(Math.round(n)),
    });
    return out;
  } catch (err) {
    if (err instanceof mod.BackgroundRemovalError) {
      throw new CutoutError(err.toUserMessage(), 'NATIVE_UNAVAILABLE');
    }
    throw err;
  }
}

async function removeBackgroundCloud(uri: string, apiKey: string): Promise<CutoutResult> {
  const form = new FormData();
  form.append('size', 'auto');
  form.append('format', 'png');
  form.append('type', 'auto');
  form.append('image_file', {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
  });

  if (!res.ok) {
    throw new CutoutError(`Background removal failed (${res.status})`, 'CLOUD_FAILED');
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

  const outPath = `${FileSystem.cacheDirectory}cutout_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { width, height } = await imageSize(outPath);
  return { uri: outPath, width, height, method: 'removebg' };
}

const METHOD_LABEL: Record<CutoutMethod, string> = {
  native: 'On-device AI · subject traced',
  removebg: 'Cloud AI · subject traced',
};

export function cutoutMethodLabel(method: CutoutMethod): string {
  return METHOD_LABEL[method];
}

/**
 * Detect and cut the main subject (transparent PNG).
 * Uses native ML first; optional remove.bg fallback when keyed.
 */
export async function extractSubject(uri: string, onProgress?: CutoutProgress): Promise<CutoutResult> {
  onProgress?.(2, 'Preparing photo');
  let fileUri: string;
  try {
    fileUri = await ensureFileUri(uri);
    await imageSize(fileUri);
  } catch {
    throw new CutoutError('Could not read this image.', 'INVALID_IMAGE');
  }

  onProgress?.(8, 'Finding main subject');

  if (Platform.OS === 'web') {
    const key = removeBgApiKey();
    if (!key) {
      throw new CutoutError(
        'Subject cutout needs a development build on your phone, or add EXPO_PUBLIC_REMOVE_BG_API_KEY for web.',
        'NATIVE_UNAVAILABLE',
      );
    }
    onProgress?.(30, 'Cloud cutout');
    const cloud = await removeBackgroundCloud(fileUri, key);
    onProgress?.(100, 'Done');
    return cloud;
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
    const key = removeBgApiKey();
    if (key) {
      try {
        onProgress?.(25, 'Trying cloud cutout');
        const cloud = await removeBackgroundCloud(fileUri, key);
        onProgress?.(100, 'Done');
        return cloud;
      } catch {
        /* fall through */
      }
    }

    const isExpoGo = Constants.appOwnership === 'expo';
    throw new CutoutError(
      isExpoGo
        ? 'Accurate cutouts need a development build (not Expo Go). Run: npx expo run:ios or npx expo run:android'
        : 'Could not isolate the subject. Use one clear item (food, drink, person) with contrast against the background, then try again.',
      nativeErr instanceof CutoutError ? nativeErr.code : 'NATIVE_UNAVAILABLE',
    );
  }
}
