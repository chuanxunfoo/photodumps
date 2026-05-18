/** In-memory handoff so the swiper can open an exact duplicate set without huge URL params. */

export type SwiperAssetPayload = {
  id: string;
  uri: string;
  width: number;
  height: number;
  duration: number;
  mediaType: 'photo' | 'video';
  creationTime: number;
  sizeMB: number;
  device: string;
  dateStr: string;
};

let stash: SwiperAssetPayload[] | null = null;

export function setDuplicateSwiperPayload(assets: SwiperAssetPayload[]) {
  stash = assets.length ? [...assets] : null;
}

export function takeDuplicateSwiperPayload(): SwiperAssetPayload[] | null {
  const out = stash;
  stash = null;
  return out;
}
