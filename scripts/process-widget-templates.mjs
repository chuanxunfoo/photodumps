/**
 * Process widget templates for exact iOS sizes.
 * Cutouts: strip white + black, scale art to FILL the widget (no letterbox margins).
 * Square/boxy → small + large only. Wide → medium only.
 *
 * Local only: npm install --no-save sharp && node scripts/process-widget-templates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ASSETS_IN = path.join(
  process.env.WIDGET_RAW_DIR ??
    path.join(
      process.env.USERPROFILE ?? process.env.HOME ?? '',
      '.cursor/projects/c-Users-ChuanXunFoo-Dumplt-app/assets',
    ),
);
const OUT_DIR = path.join(ROOT, 'app/assets/widget-templates');
const MANIFEST = path.join(__dirname, 'widget-templates.manifest.json');

const FAMILIES = {
  small: { w: 510, h: 510 },
  medium: { w: 1080, h: 507 },
  large: { w: 1080, h: 1128 },
};

function findSourceFile(srcToken) {
  const files = fs.readdirSync(ASSETS_IN);
  const hit = files.find(f => f.includes(srcToken));
  if (!hit) throw new Error(`Missing source for token ${srcToken}`);
  return path.join(ASSETS_IN, hit);
}

/** Square/boxy art → small + large. Wide panoramas → medium only. Never mix. */
function inferFamilies(meta, kind) {
  if (kind === 'cutout') return ['small', 'large'];
  const ar = meta.width / meta.height;
  if (ar > 1.32) return ['medium'];
  return ['small', 'large'];
}

function isMattePixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const chroma = max - min;
  if (lum < 52 && chroma < 28) return true;
  if (lum > 245 && chroma < 10) return true;
  if (lum > 228 && chroma < 22) return true;
  if (lum > 200 && r > 195 && g > 190 && b > 170 && chroma < 40) return true;
  return false;
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

/** Flood-remove border-connected backgrounds (white, black, cream, flat color mats). */
function floodStripBorder(data, w, h, tolerance = 52) {
  const size = w * h;
  const visited = new Uint8Array(size);
  const queue = [];
  let qi = 0;

  const trySeed = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    visited[idx] = 1;
    queue.push([idx, data[i], data[i + 1], data[i + 2]]);
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (qi < queue.length) {
    const [idx, sr, sg, sb] = queue[qi++];
    const i = idx * 4;
    data[i + 3] = 0;

    const x = idx % w;
    const y = (idx - x) / w;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx]) continue;
      const ni = nidx * 4;
      const nr = data[ni];
      const ng = data[ni + 1];
      const nb = data[ni + 2];
      if (colorDist(nr, ng, nb, sr, sg, sb) <= tolerance || isMattePixel(nr, ng, nb)) {
        visited[nidx] = 1;
        queue.push([nidx, sr, sg, sb]);
      }
    }
  }
}

async function stripFillerBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  floodStripBorder(data, w, h);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isMattePixel(r, g, b)) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

/** Cutout scaled to cover entire widget canvas — transparent only outside the figure. */
async function processCutout(input, w, h) {
  const trimmed = await sharp(input).trim({ threshold: 18 }).png().toBuffer();
  const cut = await stripFillerBackground(trimmed);
  const cutBuf = await cut.png().toBuffer();
  return sharp(cutBuf)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function processFull(input, w, h) {
  return sharp(input)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(ASSETS_IN)) {
    console.error('Raw assets folder not found:', ASSETS_IN);
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const catalog = [];

  for (const entry of entries) {
    const { src, id, name } = entry;
    const kindNorm = entry.kind === 'overlay' ? 'cutout' : entry.kind;
    const input = findSourceFile(src);
    const srcMeta = await sharp(input).metadata();
    const families = inferFamilies(srcMeta, kindNorm);

    const dir = path.join(OUT_DIR, id);
    fs.mkdirSync(dir, { recursive: true });

    for (const family of families) {
      const { w, h } = FAMILIES[family];
      const buf =
        kindNorm === 'cutout' ? await processCutout(input, w, h) : await processFull(input, w, h);
      fs.writeFileSync(path.join(dir, `${family}.png`), buf);
    }

    catalog.push({ id, name, kind: kindNorm, families });
    console.log(`✓ ${id} [${families.join(', ')}] ${kindNorm}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, '_catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`\n${catalog.length} templates → ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
