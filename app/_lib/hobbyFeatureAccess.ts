import AsyncStorage from '@react-native-async-storage/async-storage';

/** Free sticker creations for Hobby users before paywall. */
export const HOBBY_STICKER_TRIES = 2;

function welcomeKey(uid: string) {
  return `@dumpit_hobby_welcome:${uid}`;
}

function trimTrialKey(uid: string) {
  return `@dumpit_hobby_trim_trial:${uid}`;
}

function stickerCountKey(uid: string) {
  return `@dumpit_hobby_sticker_count:${uid}`;
}

export async function shouldShowHobbyWelcome(uid: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(welcomeKey(uid));
  return v !== '1';
}

export async function markHobbyWelcomeShown(uid: string): Promise<void> {
  await AsyncStorage.setItem(welcomeKey(uid), '1');
}

/** `true` while the one-time Hobby export is still available. */
export async function hasVideoTrimTrial(uid: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(trimTrialKey(uid));
  return v !== 'used';
}

export async function consumeVideoTrimTrial(uid: string): Promise<void> {
  await AsyncStorage.setItem(trimTrialKey(uid), 'used');
}

export async function getStickerCreateCount(uid: string): Promise<number> {
  const raw = await AsyncStorage.getItem(stickerCountKey(uid));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function canCreateSticker(uid: string): Promise<boolean> {
  return (await getStickerCreateCount(uid)) < HOBBY_STICKER_TRIES;
}

export async function recordStickerCreated(uid: string): Promise<number> {
  const next = (await getStickerCreateCount(uid)) + 1;
  await AsyncStorage.setItem(stickerCountKey(uid), String(next));
  return next;
}
