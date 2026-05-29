/**
 * Sharp template cutouts for widget PNGs.
 * - Strip only pure outer white/cream sheet (never eats into art).
 * - Soft alpha on edges, small padding so hands/outlines stay intact.
 *
 * Mac: npm install --no-save sharp && node scripts/process-widget-templates.mjs
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

function inferFamilies(meta, kind) {
  if (kind === 'cutout') return ['small', 'large'];
  const ar = meta.width / meta.height;
  if (ar > 1.32) return ['medium'];
  return ['small', 'large'];
}

/** Only the export sheet behind the template — not interior colors. */
function isOuterMatte(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const chroma = max - min;
  if (lum > 248 && chroma < 14) return true;
  if (lum > 232 && chroma < 20) return true;
  return false;
}

function floodStripOuterMatte(data, w, h) {
  const size = w * h;
  const visited = new Uint8Array(size);
  const queue = [];
  let qi = 0;

  const seed = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isOuterMatte(data[i], data[i + 1], data[i + 2])) return;
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
      if (isOuterMatte(data[ni], data[ni + 1], data[ni + 2])) {
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }
  }
}

async function cutoutExactShape(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodStripOuterMatte(data, info.width, info.height);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .extend({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png();
}

async function processTemplate(input, w, h) {
  const shape = await cutoutExactShape(input);
  return shape
    .resize(w, h, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
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
      const buf = await processTemplate(input, w, h);
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
