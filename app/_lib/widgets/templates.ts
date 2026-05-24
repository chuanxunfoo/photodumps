import { Image } from 'react-native';
import type { WidgetTemplate } from './types';

const IMG = {
  waveScrapbook: require('../../assets/widget-templates/wave-scrapbook.png'),
  starrySky: require('../../assets/widget-templates/starry-sky.png'),
  lockers: require('../../assets/widget-templates/lockers.png'),
  denimFrame: require('../../assets/widget-templates/denim-frame.png'),
  ginghamCenter: require('../../assets/widget-templates/gingham-center.png'),
  clipboardPenco: require('../../assets/widget-templates/clipboard-penco.png'),
  archiveGingham: require('../../assets/widget-templates/archive-gingham.png'),
  digicam: require('../../assets/widget-templates/digicam.png'),
  gridPaper: require('../../assets/widget-templates/grid-paper.png'),
  picnicTable: require('../../assets/widget-templates/picnic-table.png'),
} as const;

/** Measured once from bundled assets (approximate for layout). */
const AR: Record<string, number> = {
  'wave-scrapbook': 1.45,
  'starry-sky': 2.1,
  lockers: 2.05,
  'denim-frame': 2.0,
  'gingham-center': 1.55,
  'clipboard-penco': 0.85,
  'archive-gingham': 1.35,
  digicam: 1.75,
  'grid-paper': 1.35,
  'picnic-table': 1.45,
};

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'clipboard-penco',
    name: 'Clipboard',
    image: IMG.clipboardPenco,
    aspectRatio: AR['clipboard-penco'],
    placementMode: 'zones',
    zones: [{ x: 0.1, y: 0.2, w: 0.8, h: 0.58 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'wave-scrapbook',
    name: 'Wave journal',
    image: IMG.waveScrapbook,
    aspectRatio: AR['wave-scrapbook'],
    placementMode: 'zones',
    zones: [{ x: 0.07, y: 0.1, w: 0.86, h: 0.7 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'archive-gingham',
    name: 'Archive',
    image: IMG.archiveGingham,
    aspectRatio: AR['archive-gingham'],
    placementMode: 'zones',
    zones: [{ x: 0.14, y: 0.14, w: 0.72, h: 0.68 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'gingham-center',
    name: 'Gingham',
    image: IMG.ginghamCenter,
    aspectRatio: AR['gingham-center'],
    placementMode: 'zones',
    zones: [{ x: 0.1, y: 0.08, w: 0.8, h: 0.82 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'denim-frame',
    name: 'Denim',
    image: IMG.denimFrame,
    aspectRatio: AR['denim-frame'],
    placementMode: 'zones',
    zones: [{ x: 0.06, y: 0.1, w: 0.88, h: 0.78 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'lockers',
    name: 'Lockers',
    image: IMG.lockers,
    aspectRatio: AR.lockers,
    placementMode: 'zones',
    zones: [
      { x: 0.34, y: 0.12, w: 0.32, h: 0.55 },
      { x: 0.06, y: 0.2, w: 0.26, h: 0.45 },
      { x: 0.68, y: 0.2, w: 0.26, h: 0.45 },
    ],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'digicam',
    name: 'Digicam',
    image: IMG.digicam,
    aspectRatio: AR.digicam,
    placementMode: 'zones',
    zones: [{ x: 0.06, y: 0.2, w: 0.52, h: 0.48 }],
    maxStickers: 6,
    captionEnabled: true,
  },
  {
    id: 'grid-paper',
    name: 'Grid notes',
    image: IMG.gridPaper,
    aspectRatio: AR['grid-paper'],
    placementMode: 'zones',
    zones: [{ x: 0.4, y: 0.06, w: 0.56, h: 0.88 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'picnic-table',
    name: 'Picnic',
    image: IMG.picnicTable,
    aspectRatio: AR['picnic-table'],
    placementMode: 'zones',
    zones: [{ x: 0.05, y: 0.04, w: 0.9, h: 0.58 }],
    maxStickers: 8,
    captionEnabled: true,
  },
  {
    id: 'starry-sky',
    name: 'Starry',
    image: IMG.starrySky,
    aspectRatio: AR['starry-sky'],
    placementMode: 'free',
    maxStickers: 10,
    captionEnabled: true,
  },
];

export function getWidgetTemplate(id: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find(t => t.id === id);
}

/** Resolve real aspect ratio from asset (call once on editor mount). */
export function resolveTemplateAspectRatio(
  template: WidgetTemplate,
  onResolved: (ratio: number) => void,
): void {
  const src = Image.resolveAssetSource(template.image);
  if (src?.width && src?.height) {
    onResolved(src.width / src.height);
  }
}
