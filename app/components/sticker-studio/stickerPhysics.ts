import type { SavedSticker } from '../../_lib/stickerStudio/types';

export type PhysicsBody = {
  id: string;
  uri: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Fixed tilt — no spin animation */
  rotation: number;
};

export const JAR_H = 252;
export const STICKER_D = 64;
export const STICKERS_PER_JAR = 9;

export function chunkStickers<T>(items: T[], perJar: number): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perJar) {
    pages.push(items.slice(i, i + perJar));
  }
  return pages;
}

export function spawnBodies(
  stickers: SavedSticker[],
  width: number,
  height: number,
  diameter: number = STICKER_D,
): PhysicsBody[] {
  const r = diameter * 0.48;
  const pad = r + 6;
  return stickers.map((s, i) => ({
    id: s.id,
    uri: s.uri,
    x: pad + Math.random() * Math.max(1, width - pad * 2),
    y: pad + (i % 3) * 18,
    vx: (Math.random() - 0.5) * 30,
    vy: Math.random() * 20,
    r,
    rotation: (Math.random() - 0.5) * 14,
  }));
}

function resolveWall(b: PhysicsBody, w: number, h: number) {
  const pad = 4;
  if (b.x - b.r < pad) {
    b.x = pad + b.r;
    b.vx = Math.abs(b.vx) * 0.35;
  }
  if (b.x + b.r > w - pad) {
    b.x = w - pad - b.r;
    b.vx = -Math.abs(b.vx) * 0.35;
  }
  if (b.y - b.r < pad) {
    b.y = pad + b.r;
    b.vy = Math.abs(b.vy) * 0.35;
  }
  if (b.y + b.r > h - pad) {
    b.y = h - pad - b.r;
    b.vy = -Math.abs(b.vy) * 0.42;
    b.vx *= 0.92;
  }
}

function resolvePair(a: PhysicsBody, b: PhysicsBody) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const min = a.r + b.r;
  if (distSq >= min * min || distSq < 1e-6) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const vn = dvx * nx + dvy * ny;
  if (vn > 0) return;

  const impulse = -vn * 0.55;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}

export function stepPhysics(
  bodies: PhysicsBody[],
  width: number,
  height: number,
  gx: number,
  gy: number,
  dt: number,
) {
  const drag = 0.988;
  const maxV = 520;

  for (const b of bodies) {
    b.vx += gx * dt;
    b.vy += gy * dt;
    b.vy += 280 * dt;
    b.vx *= drag;
    b.vy *= drag;
    b.vx = Math.max(-maxV, Math.min(maxV, b.vx));
    b.vy = Math.max(-maxV, Math.min(maxV, b.vy));
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  for (let i = 0; i < 5; i++) {
    for (let a = 0; a < bodies.length; a++) {
      resolveWall(bodies[a], width, height);
      for (let b = a + 1; b < bodies.length; b++) {
        resolvePair(bodies[a], bodies[b]);
      }
    }
  }
}
