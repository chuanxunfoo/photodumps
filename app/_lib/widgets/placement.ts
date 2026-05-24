import type { PlacementZone } from './types';

export function zonesToPx(
  zones: PlacementZone[],
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number }[] {
  return zones.map(z => ({
    x: z.x * canvasW,
    y: z.y * canvasH,
    w: z.w * canvasW,
    h: z.h * canvasH,
  }));
}

function pointInZone(cx: number, cy: number, z: { x: number; y: number; w: number; h: number }): boolean {
  return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;
}

/** Keep sticker center inside allowed zones; snap to nearest zone if outside. */
export function clampStickerToZones(
  x: number,
  y: number,
  stickerSize: number,
  zones: PlacementZone[],
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const px = zonesToPx(zones, canvasW, canvasH);
  const half = stickerSize / 2;
  const cx = x + half;
  const cy = y + half;

  for (const z of px) {
    if (pointInZone(cx, cy, z)) {
      return {
        x: Math.max(z.x, Math.min(z.x + z.w - stickerSize, x)),
        y: Math.max(z.y, Math.min(z.y + z.h - stickerSize, y)),
      };
    }
  }

  let best = px[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const z of px) {
    const zx = z.x + z.w / 2;
    const zy = z.y + z.h / 2;
    const d = (cx - zx) ** 2 + (cy - zy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  const nx = best.x + (best.w - stickerSize) / 2;
  const ny = best.y + (best.h - stickerSize) / 2;
  return {
    x: Math.max(best.x, Math.min(best.x + best.w - stickerSize, nx)),
    y: Math.max(best.y, Math.min(best.y + best.h - stickerSize, ny)),
  };
}

/** Spread new stickers inside the primary zone. */
export function initialStickerPositions(
  count: number,
  zones: PlacementZone[],
  canvasW: number,
  canvasH: number,
  baseSize: number,
): { x: number; y: number }[] {
  const z = zonesToPx(zones, canvasW, canvasH)[0];
  const cols = Math.min(count, 4);
  const rows = Math.ceil(count / cols);
  const cellW = z.w / cols;
  const cellH = z.h / rows;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({
      x: z.x + col * cellW + (cellW - baseSize) / 2,
      y: z.y + row * cellH + (cellH - baseSize) / 2,
    });
  }
  return out;
}

export function randomFreePosition(
  canvasW: number,
  canvasH: number,
  baseSize: number,
  index: number,
  total: number,
): { x: number; y: number } {
  const cols = Math.min(total, 4);
  const pad = 12;
  const cellW = (canvasW - pad * 2) / cols;
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: pad + col * cellW + (cellW - baseSize) / 2,
    y: pad + row * (baseSize + 16),
  };
}
