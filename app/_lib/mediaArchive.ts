import type { Asset, Album, AssetsOptions } from 'expo-media-library';
import { Platform } from 'react-native';

import { withMediaLibraryMutex } from './firstLaunchPermissions';
import { runNativeOperation } from './launchStability';

/** Lazy-load native module — top-level import crashes Hermes during hub navigation. */
async function getMediaLibrary() {
  return runNativeOperation(() => import('expo-media-library'));
}

const PAGE_SIZE = 280;
/** Photos older than this are "lost & found" candidates. */
const RANDOM_AGE_MS = 18 * 30 * 24 * 60 * 60 * 1000;

/** Swipe deck loads photos only — videos show a black screen in the card UI. */
export const SWIPE_MEDIA_TYPES = ['photo'] as const;

export type SwiperMediaItem = Asset & {
  mediaType: 'photo' | 'video';
  sizeMB: number;
  device: string;
  dateStr: string;
};

export const RANDOM_VAULT = {
  name: 'LOST & FOUND',
  short: 'RND',
  num: 0,
  colors: ['#001828', '#0A3D5C', '#00B4D8'] as const,
  tagline: 'Old shots, screenshots & docs you forgot',
} as const;

export function mapAssetToSwiper(a: Asset): SwiperMediaItem {
  const isVid = a.mediaType === 'video';
  return {
    ...a,
    mediaType: isVid ? 'video' : 'photo',
    sizeMB: isVid
      ? +(Math.max(0.4, a.duration) * 0.38).toFixed(2)
      : +((a.width * a.height) * 0.00000045).toFixed(2),
    device: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    dateStr: new Date(a.creationTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

async function yieldUi(): Promise<void> {
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

export async function countAssetsInRange(
  createdAfter: number,
  createdBefore: number,
  mediaType: AssetsOptions['mediaType'] = SWIPE_MEDIA_TYPES,
): Promise<number> {
  return withMediaLibraryMutex(async () => {
    const MediaLibrary = await getMediaLibrary();
    const { totalCount } = await MediaLibrary.getAssetsAsync({
      first: 0,
      mediaType,
      createdAfter,
      createdBefore,
      sortBy: 'creationTime',
    });
    return totalCount ?? 0;
  });
}

export async function fetchAssetsPaged(
  options: Omit<AssetsOptions, 'first' | 'after'>,
  onProgress?: (loaded: number, total: number | null) => void,
): Promise<Asset[]> {
  const MediaLibrary = await getMediaLibrary();
  let after: string | undefined;
  let collected: Asset[] = [];
  let total: number | null = null;
  let pageIndex = 0;

  while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      ...options,
      first: PAGE_SIZE,
      after,
      mediaType: options.mediaType ?? SWIPE_MEDIA_TYPES,
    });
    if (total == null && page.totalCount != null) total = page.totalCount;
    collected = collected.concat(page.assets);
    onProgress?.(collected.length, total);

    if (!page.hasNextPage) break;
    after = page.endCursor;
    pageIndex += 1;
    if (pageIndex % 2 === 0) await yieldUi();
  }

  return collected;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

async function findScreenshotsAlbum(): Promise<Album | null> {
  try {
    const MediaLibrary = await getMediaLibrary();
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    return albums.find(a => /screenshot/i.test(a.title)) ?? null;
  } catch {
    return null;
  }
}

/** Old, overlooked library items — screenshots, aged photos, shuffled. */
export async function countRandomVaultAssets(): Promise<number> {
  const cutoff = Date.now() - RANDOM_AGE_MS;
  const epoch = new Date(1970, 0, 1).getTime();
  return countAssetsInRange(epoch, cutoff);
}

export async function fetchRandomVaultAssets(
  onProgress?: (loaded: number, total: number | null) => void,
): Promise<Asset[]> {
  const cutoff = Date.now() - RANDOM_AGE_MS;
  const byId = new Map<string, Asset>();

  const add = (list: Asset[]) => {
    for (const a of list) byId.set(a.id, a);
    onProgress?.(byId.size, null);
  };

  const old = await fetchAssetsPaged(
    {
      createdBefore: cutoff,
      sortBy: 'creationTime',
      mediaType: SWIPE_MEDIA_TYPES,
    },
    (loaded, total) => onProgress?.(byId.size + loaded, total),
  );
  add(old);

  const album = await findScreenshotsAlbum();
  if (album) {
    const shots = await fetchAssetsPaged({ album, sortBy: 'creationTime', mediaType: SWIPE_MEDIA_TYPES });
    add(shots);
  }

  if (Platform.OS === 'ios') {
    try {
      const iosShots = await fetchAssetsPaged({
        mediaType: SWIPE_MEDIA_TYPES,
        mediaSubtypes: ['screenshot'],
        sortBy: 'creationTime',
      });
      add(iosShots);
    } catch {
      // ignore
    }
  }

  const merged = Array.from(byId.values());
  return shuffleInPlace(merged);
}

function estimateBytes(a: Asset): number {
  if (a.mediaType === 'video') return Math.max(400_000, a.duration * 380_000);
  return Math.max(80_000, a.width * a.height * 0.45);
}

/** Heavy photos/videos that free the most storage — not the whole roll. */
export function scoreDeepCleanCandidate(a: Asset): number {
  const pixels = a.width * a.height;
  const bytes = estimateBytes(a);
  const longEdge = Math.max(a.width, a.height);
  const videoBoost = a.mediaType === 'video' ? 1.35 : 1;
  return (bytes / 1_000_000) * 0.55 + (pixels / 1_000_000) * 0.35 + (longEdge / 1000) * 0.25 * videoBoost;
}

const DEEP_CLEAN_MIN_SCORE = 2.8;
const DEEP_CLEAN_MAX_ITEMS = 420;

export async function fetchDeepCleanCandidates(
  onProgress?: (loaded: number, total: number | null) => void,
): Promise<Asset[]> {
  const MediaLibrary = await getMediaLibrary();
  const pageSize = 320;
  let after: string | undefined;
  const heavy: Asset[] = [];
  let scanned = 0;
  let total: number | null = null;

  while (heavy.length < DEEP_CLEAN_MAX_ITEMS * 2) {
    const page = await MediaLibrary.getAssetsAsync({
      first: pageSize,
      after,
      mediaType: SWIPE_MEDIA_TYPES,
      sortBy: 'creationTime',
    });
    if (total == null && page.totalCount != null) total = page.totalCount;
    scanned += page.assets.length;
    onProgress?.(scanned, total);

    for (const a of page.assets) {
      if (scoreDeepCleanCandidate(a) >= DEEP_CLEAN_MIN_SCORE) heavy.push(a);
    }

    if (!page.hasNextPage) break;
    after = page.endCursor;
    if (scanned > 8000) break;
  }

  heavy.sort((a, b) => scoreDeepCleanCandidate(b) - scoreDeepCleanCandidate(a));
  return heavy.slice(0, DEEP_CLEAN_MAX_ITEMS);
}

/** Heuristic: heavy photos / videos that free meaningful storage. */
export function scoreStorageWeight(a: Asset): number {
  const isVid = a.mediaType === 'video';
  const pixels = a.width * a.height;
  const mb = isVid
    ? Math.max(0.5, a.duration) * 0.38
    : pixels * 0.00000045;
  const longEdge = Math.max(a.width, a.height);
  return mb * 1.4 + longEdge / 900 + pixels / 2_500_000;
}

export function filterDeepCleanCandidates(assets: Asset[]): Asset[] {
  const MIN_MB = 2.8;
  const MIN_PIXELS = 2_200_000;
  const MIN_EDGE = 1400;

  const heavy = assets.filter(a => {
    const isVid = a.mediaType === 'video';
    const mb = isVid ? Math.max(0.5, a.duration) * 0.38 : a.width * a.height * 0.00000045;
    const longEdge = Math.max(a.width, a.height);
    if (isVid && a.duration >= 8) return true;
    if (mb >= MIN_MB) return true;
    if (a.width * a.height >= MIN_PIXELS) return true;
    if (longEdge >= MIN_EDGE && mb >= 1.2) return true;
    return false;
  });

  return heavy
    .sort((a, b) => scoreStorageWeight(b) - scoreStorageWeight(a))
    .slice(0, 420);
}

export function monthRange(year: number, monthIndex0: number): { createdAfter: number; createdBefore: number } {
  return {
    createdAfter: new Date(year, monthIndex0, 1).getTime(),
    createdBefore: new Date(year, monthIndex0 + 1, 0, 23, 59, 59).getTime(),
  };
}
