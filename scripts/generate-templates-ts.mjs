/**
 * Generates templates.ts from _catalog.json + per-family PNG folders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, '..', 'app/assets/widget-templates/_catalog.json');
const OUT = path.join(__dirname, '..', 'app/_lib/widgets/templates.ts');

function toKey(id) {
  return id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

const imgLines = [];
for (const t of catalog) {
  const key = toKey(t.id);
  for (const f of t.families) {
    imgLines.push(`  ${key}_${f}: require('../../assets/widget-templates/${t.id}/${f}.png'),`);
  }
}

const listBlock = catalog
  .map(t => {
    const key = toKey(t.id);
    const images = t.families
      .map(f => `      ${f}: IMG.${key}_${f},`)
      .join('\n');
    return `  {
    id: ${JSON.stringify(t.id)},
    name: ${JSON.stringify(t.name)},
    kind: ${JSON.stringify(t.kind)},
    families: ${JSON.stringify(t.families)},
    images: {
${images}
    },
    placementMode: 'free',
    maxStickers: ${t.kind === 'cutout' ? 10 : 12},
    captionEnabled: true,
  }`;
  })
  .join(',\n');

const content = `import type { WidgetTemplate } from './types';

const IMG = {
${imgLines.join('\n')}
} as const;

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
${listBlock},
];

export function getWidgetTemplate(id: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find(t => t.id === id);
}

export function templateImage(template: WidgetTemplate, family: import('./widgetSizes').WidgetFamily) {
  return template.images[family] ?? template.images[template.families[0]];
}

export function templatesForFamily(family: import('./widgetSizes').WidgetFamily): WidgetTemplate[] {
  return WIDGET_TEMPLATES.filter(t => {
    if (!t.families.includes(family)) return false;
    if (family === 'medium' && t.kind === 'cutout') return false;
    if ((family === 'small' || family === 'large') && t.families.length === 1 && t.families[0] === 'medium') {
      return false;
    }
    return true;
  });
}
`;

fs.writeFileSync(OUT, content);
console.log(`Wrote ${catalog.length} templates → ${OUT}`);
