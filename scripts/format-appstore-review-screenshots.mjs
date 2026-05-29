/**
 * Trim white margins and resize preview PNGs for App Store Connect
 * (subscription review screenshots — iPhone 6.7" portrait).
 *
 * Usage: node scripts/format-appstore-review-screenshots.mjs [inputDir] [outputDir]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Apple Connect accepted sizes (portrait). */
const TARGET_W = 1284;
const TARGET_H = 2778;

const inputDir = process.argv[2] ?? path.join(process.env.USERPROFILE ?? '', 'Downloads', 'preview');
const outputDir =
  process.argv[3] ?? path.join(inputDir, 'app-store-ready');

async function main() {
  const sharp = (await import('sharp')).default;
  if (!fs.existsSync(inputDir)) {
    console.error('Input folder not found:', inputDir);
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (!files.length) {
    console.error('No PNG/JPEG files in', inputDir);
    process.exit(1);
  }

  const labels = ['weekly', 'monthly', 'yearly'];

  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const inPath = path.join(inputDir, name);
    const base = path.basename(name, path.extname(name));
    const label = labels[i] ?? base;
    const outPath = path.join(outputDir, `${label}-subscription-review.png`);

    const trimmed = await sharp(inPath)
      .trim({ threshold: 12, background: '#ffffff' })
      .toBuffer({ resolveWithObject: true });

    const { width, height } = trimmed.info;
    console.log(`${name}: ${trimmed.info.width}x${height} after trim (was loaded from file)`);

    await sharp(trimmed.data)
      .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outPath);

    const stat = fs.statSync(outPath);
    console.log(`  -> ${outPath} (${TARGET_W}x${TARGET_H}, ${(stat.size / 1024).toFixed(0)} KB)`);
  }

  console.log('\nDone. Upload these in App Store Connect → Subscription → Review Information.');
  console.log(`Size: ${TARGET_W} x ${TARGET_H} px portrait (iPhone 6.7" class).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
