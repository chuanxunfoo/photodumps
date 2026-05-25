/**
 * rn-remove-image-bg@0.0.32: HybridImageBackgroundRemover.swift uses Promise<T>
 * without `import NitroModules` → Xcode "cannot find type 'Promise' in scope".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swiftPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'rn-remove-image-bg',
  'ios',
  'HybridImageBackgroundRemover.swift',
);

if (!fs.existsSync(swiftPath)) {
  console.log('[patch] rn-remove-image-bg not installed — skip');
  process.exit(0);
}

let src = fs.readFileSync(swiftPath, 'utf8');
if (src.includes('import NitroModules')) {
  console.log('[patch] rn-remove-image-bg already patched');
  process.exit(0);
}

src = src.replace(
  'import UniformTypeIdentifiers\n',
  'import UniformTypeIdentifiers\nimport NitroModules\n',
);
fs.writeFileSync(swiftPath, src);
console.log('[patch] Added import NitroModules to HybridImageBackgroundRemover.swift');
