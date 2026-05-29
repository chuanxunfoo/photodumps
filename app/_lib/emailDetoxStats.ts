import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordUserStatsDeletion } from './userStatsSupabase';

const EMAIL_BYTES_KEY = '@dumpit_email_detox_bytes';
const EMAIL_COUNT_KEY = '@dumpit_email_detox_count';
const EMAIL_BATCHES_KEY = '@dumpit_email_detox_batches';

export type EmailDetoxStats = {
  bytes: number;
  count: number;
  batches: number;
};

export async function fetchEmailDetoxStats(): Promise<EmailDetoxStats> {
  const [[, b], [, c], [, batches]] = await AsyncStorage.multiGet([
    EMAIL_BYTES_KEY,
    EMAIL_COUNT_KEY,
    EMAIL_BATCHES_KEY,
  ]);
  return {
    bytes: parseFloat(b || '0') || 0,
    count: parseInt(c || '0', 10) || 0,
    batches: parseInt(batches || '0', 10) || 0,
  };
}

/** Persists email-only totals locally and adds to global storage-reclaimed stats. */
export async function recordEmailDetoxCleanup(params: {
  userId: string;
  deletedCount: number;
  deletedBytes: number;
}): Promise<void> {
  const count = Math.max(0, params.deletedCount);
  const bytes = Math.max(0, Math.round(params.deletedBytes));
  if (count <= 0 && bytes <= 0) return;

  const prev = await fetchEmailDetoxStats();
  await AsyncStorage.multiSet([
    [EMAIL_BYTES_KEY, String(prev.bytes + bytes)],
    [EMAIL_COUNT_KEY, String(prev.count + count)],
    [EMAIL_BATCHES_KEY, String(prev.batches + 1)],
  ]);

  await recordUserStatsDeletion({
    userId: params.userId,
    itemsCount: count,
    bytesCleared: bytes,
    source: 'email_detox',
  });
}
