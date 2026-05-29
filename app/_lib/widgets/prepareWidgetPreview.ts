import UPNG from 'upng-js';
import { readFileBytes, stripFileScheme, withFileScheme, writeFileBytes } from './pngIo';

function isBackgroundPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 14) return true;
  if (a > 248 && r <= 22 && g <= 22 && b <= 22) return true;
  return false;
}

/** Remove capture matte connected to image edges (the square black sheet). */
function floodStripEdgeBackground(data: Uint8Array, w: number, h: number) {
  const size = w * h;
  const visited = new Uint8Array(size);
  const queue: number[] = [];
  let qi = 0;

  const seed = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }

  while (qi < queue.length) {
    const idx = queue[qi++];
    const i = idx * 4;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 0;

    const x = idx % w;
    const y = (idx - x) / w;
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx]) continue;
      const ni = nidx * 4;
      if (isBackgroundPixel(data[ni], data[ni + 1], data[ni + 2], data[ni + 3])) {
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }
  }
}

function opaqueBounds(data: Uint8Array, w: number, h: number, alphaMin = 24) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < alphaMin) continue;
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) return null;
  return { minX, minY, maxX, maxY };
}

function cropRgba(
  data: Uint8Array,
  w: number,
  h: number,
  box: { minX: number; minY: number; maxX: number; maxY: number },
) {
  const cw = box.maxX - box.minX + 1;
  const ch = box.maxY - box.minY + 1;
  const out = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((box.minY + y) * w + (box.minX + x)) * 4;
      const di = (y * cw + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return { data: out, w: cw, h: ch };
}

/** Scale art to maxSide — output is tight (no letterbox padding in the PNG). */
function scaleTight(src: Uint8Array, sw: number, sh: number, maxSide: number) {
  const scale = maxSide / Math.max(sw, sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const out = new Uint8Array(dw * dh * 4);

  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      const sx = Math.min(sw - 1, Math.floor((dx + 0.5) / scale - 0.5));
      const sy = Math.min(sh - 1, Math.floor((dy + 0.5) / scale - 0.5));
      const si = (sy * sw + sx) * 4;
      const di = (dy * dw + dx) * 4;
      const a = src[si + 3];
      if (a < 8) continue;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = a;
    }
  }
  return { data: out, w: dw, h: dh };
}

function polishAlpha(data: Uint8Array, w: number, h: number) {
  floodStripEdgeBackground(data, w, h);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 32) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
}

function encodePng(data: Uint8Array, w: number, h: number): Uint8Array {
  const rgba = data.slice();
  const buf = rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength);
  return new Uint8Array(UPNG.encode([buf], w, h, 0));
}

/**
 * Strip capture background, crop to art, export a tight transparent PNG.
 * Letterboxing is left to the home-screen widget (clear background), not baked into the file.
 */
export async function prepareWidgetPreview(
  uri: string,
  exportW: number,
  exportH: number,
): Promise<string> {
  const fileUri = withFileScheme(uri);
  const pngBytes = await readFileBytes(fileUri);
  const pngBuf = pngBytes.buffer.slice(
    pngBytes.byteOffset,
    pngBytes.byteOffset + pngBytes.byteLength,
  );
  const img = UPNG.decode(pngBuf);
  if (!img.width || !img.height) throw new Error('PREVIEW_DECODE_FAILED');

  const frame = UPNG.toRGBA8(img)[0];
  if (!frame) throw new Error('PREVIEW_DECODE_FAILED');

  const data = new Uint8Array(frame);
  floodStripEdgeBackground(data, img.width, img.height);

  const box = opaqueBounds(data, img.width, img.height);
  if (!box) throw new Error('PREVIEW_EMPTY');

  const cropped = cropRgba(data, img.width, img.height, box);
  const maxSide = Math.max(exportW, exportH);
  const scaled = scaleTight(cropped.data, cropped.w, cropped.h, maxSide);
  polishAlpha(scaled.data, scaled.w, scaled.h);
  const encoded = encodePng(scaled.data, scaled.w, scaled.h);

  const outPath = `${stripFileScheme(fileUri).replace(/\.png$/i, '')}-export.png`;
  return writeFileBytes(outPath, encoded);
}
