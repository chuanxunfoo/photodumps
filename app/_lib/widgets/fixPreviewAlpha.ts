import UPNG from 'upng-js';
import { readFileBytes, stripFileScheme, withFileScheme, writeFileBytes } from './pngIo';

function isCaptureBlack(r: number, g: number, b: number, a: number): boolean {
  return a > 248 && r <= 18 && g <= 18 && b <= 18;
}

function neighborHasContent(data: Uint8Array, w: number, h: number, x: number, y: number): boolean {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = (ny * w + nx) * 4;
      const a = data[i + 3];
      if (a < 40) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum > 28) return true;
    }
  }
  return false;
}

/**
 * iOS view-shot empty areas → opaque black. Strip only capture background,
 * not black lines inside the template art.
 */
export async function fixWidgetPreviewAlpha(uri: string): Promise<string> {
  const fileUri = withFileScheme(uri);
  try {
    const pngBytes = await readFileBytes(fileUri);
    const pngBuf = pngBytes.buffer.slice(
      pngBytes.byteOffset,
      pngBytes.byteOffset + pngBytes.byteLength,
    );
    const img = UPNG.decode(pngBuf);
    if (!img.width || !img.height) return fileUri;

    const rgbaBuf = UPNG.toRGBA8(img)[0];
    if (!rgbaBuf) return fileUri;

    const data = new Uint8Array(rgbaBuf);
    const w = img.width;
    const h = img.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 12) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
          continue;
        }

        if (isCaptureBlack(r, g, b, a) && !neighborHasContent(data, w, h, x, y)) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
    }

    const encoded = new Uint8Array(
      UPNG.encode(
        [data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)],
        w,
        h,
        0,
      ),
    );
    const outPath = `${stripFileScheme(fileUri).replace(/\.png$/i, '')}-alpha.png`;
    return writeFileBytes(outPath, encoded);
  } catch {
    return fileUri;
  }
}
