/**
 * Reliable photo URIs for camera / picker (Expo SDK 54 — use legacy FileSystem API).
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

/** Max long edge for full-quality cutout. */
export const CUTOUT_MAX_DIMENSION = 512;
/** Smaller = faster live camera scans (cloud / WASM). */
export const CUTOUT_LIVE_DIMENSION = 320;
export const COLLAGE_BG_MAX_DIMENSION = 1280;

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

/**
 * Copy any picker/camera URI to a readable file:// path in cache.
 */
export async function resolveReadableFileUri(uri: string): Promise<string> {
  const raw = uri.trim();
  if (!raw) throw new Error('Empty image URI');

  const cache = FileSystem.cacheDirectory;
  if (!cache) throw new Error('Cache directory unavailable');

  const ext = raw.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const dest = `${cache}cutout_src_${Date.now()}.${ext}`;
  const destUri = withFileScheme(dest);

  if (raw.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(raw);
    if (info.exists) {
      if (raw === destUri) return raw;
      await FileSystem.copyAsync({ from: raw, to: destUri });
      return destUri;
    }
  }

  if (raw.startsWith('content://') || raw.startsWith('ph://') || raw.startsWith('assets-library://')) {
    await FileSystem.copyAsync({ from: raw, to: destUri });
    return destUri;
  }

  if (raw.startsWith('/')) {
    const asFile = withFileScheme(raw);
    const info = await FileSystem.getInfoAsync(asFile);
    if (info.exists) {
      await FileSystem.copyAsync({ from: asFile, to: destUri });
      return destUri;
    }
  }

  await FileSystem.copyAsync({ from: raw, to: destUri });
  const check = await FileSystem.getInfoAsync(destUri);
  if (!check.exists) throw new Error('Could not copy image to cache');
  return destUri;
}

function resizeActions(width: number, height: number, maxDim: number): ImageManipulator.Action[] {
  if (width <= maxDim && height <= maxDim) return [];
  if (width >= height) return [{ resize: { width: maxDim } }];
  return [{ resize: { height: maxDim } }];
}

export type ViewportPoint = { x: number; y: number };

/**
 * Crop a square around a tap on a cover-scaled preview (0–1 coords in viewport).
 * Helps cutout focus on the object the user pointed at.
 */
export async function cropPhotoAroundViewportPoint(
  uri: string,
  point: ViewportPoint,
  viewport: { width: number; height: number },
  cropFraction = 0.62,
): Promise<string> {
  const readable = await resolveReadableFileUri(uri);
  const { width: imgW, height: imgH } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      Image.getSize(readable, (w, h) => resolve({ width: w, height: h }), reject);
    },
  );

  const viewAspect = viewport.width / viewport.height;
  const imageAspect = imgW / imgH;

  let visibleW: number;
  let visibleH: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > viewAspect) {
    visibleH = imgH;
    visibleW = imgH * viewAspect;
    offsetX = (imgW - visibleW) / 2;
    offsetY = 0;
  } else {
    visibleW = imgW;
    visibleH = imgW / viewAspect;
    offsetX = 0;
    offsetY = (imgH - visibleH) / 2;
  }

  const px = offsetX + Math.max(0, Math.min(1, point.x)) * visibleW;
  const py = offsetY + Math.max(0, Math.min(1, point.y)) * visibleH;
  const side = Math.min(visibleW, visibleH) * cropFraction;

  let originX = Math.round(px - side / 2);
  let originY = Math.round(py - side / 2);
  let cropSize = Math.round(side);

  originX = Math.max(0, Math.min(originX, imgW - 1));
  originY = Math.max(0, Math.min(originY, imgH - 1));
  cropSize = Math.max(48, Math.min(cropSize, imgW - originX, imgH - originY));

  const { uri: out } = await ImageManipulator.manipulateAsync(
    readable,
    [{ crop: { originX, originY, width: cropSize, height: cropSize } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return withFileScheme(out);
}

/** Normalize + downscale for cutout (big speed win on phone photos). */
export async function normalizePhotoForCutout(
  uri: string,
  maxDimension = CUTOUT_MAX_DIMENSION,
): Promise<string> {
  const readable = await resolveReadableFileUri(uri);
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(readable, (w, h) => resolve({ width: w, height: h }), reject);
  });
  const { uri: out } = await ImageManipulator.manipulateAsync(
    readable,
    resizeActions(width, height, maxDimension),
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return withFileScheme(out);
}

/** Downscale collage background so the editor opens quickly. */
export async function normalizePhotoForCollage(
  uri: string,
  maxDimension = COLLAGE_BG_MAX_DIMENSION,
): Promise<string> {
  const readable = await resolveReadableFileUri(uri);
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(readable, (w, h) => resolve({ width: w, height: h }), reject);
  });
  const { uri: out } = await ImageManipulator.manipulateAsync(
    readable,
    resizeActions(width, height, maxDimension),
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
  );
  return withFileScheme(out);
}

export async function readPhotoBase64(uri: string): Promise<{ dataUrl: string; fileUri: string }> {
  const fileUri = await resolveReadableFileUri(uri);
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mime = fileUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
  return {
    dataUrl: `data:${mime};base64,${base64}`,
    fileUri,
  };
}

export async function writePngBase64(base64: string): Promise<string> {
  const cache = FileSystem.cacheDirectory;
  if (!cache) throw new Error('Cache directory unavailable');
  const dest = `${cache}cutout_out_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return withFileScheme(dest);
}

export { stripFileScheme, withFileScheme };
