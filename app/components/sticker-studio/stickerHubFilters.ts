import type { SavedSticker } from '../../_lib/stickerStudio/types';

export type StickerHubFilterId = 'all' | string;

export function stickerMonthKey(createdAt: number): string {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function stickerMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function monthKeysNewestFirst(library: SavedSticker[]): string[] {
  const set = new Set<string>();
  for (const s of library) set.add(stickerMonthKey(s.createdAt));
  return [...set].sort((a, b) => b.localeCompare(a));
}

export function visibleStickerFilters(library: SavedSticker[]): { id: StickerHubFilterId; label: string }[] {
  const months = monthKeysNewestFirst(library);
  return [
    { id: 'all', label: 'All' },
    ...months.map(id => ({ id, label: stickerMonthLabel(id) })),
  ];
}

export function filterStickerLibrary(library: SavedSticker[], filter: StickerHubFilterId): SavedSticker[] {
  if (filter === 'all') return library;
  return library.filter(s => stickerMonthKey(s.createdAt) === filter);
}

export function stickerFilterCounts(library: SavedSticker[]): Record<string, number> {
  const counts: Record<string, number> = { all: library.length };
  for (const s of library) {
    const k = stickerMonthKey(s.createdAt);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
