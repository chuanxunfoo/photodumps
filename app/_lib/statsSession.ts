import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_ID_KEY = '@dumpit_stats_session_id';
const SESSION_STARTED_KEY = '@dumpit_stats_session_started_at';
/** Bytes/items cleared in-app during current stats session (survives until “New session” or reset). */
const SESSION_CLEARED_BYTES_KEY = '@dumpit_stats_session_cleared_bytes';
const SESSION_CLEARED_ITEMS_KEY = '@dumpit_stats_session_cleared_items';

export async function getOrCreateStatsSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(SESSION_ID_KEY);
  if (existing && existing.length > 10) return existing;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await AsyncStorage.setItem(SESSION_ID_KEY, id);
  await AsyncStorage.setItem(SESSION_STARTED_KEY, new Date().toISOString());
  await AsyncStorage.multiRemove([SESSION_CLEARED_BYTES_KEY, SESSION_CLEARED_ITEMS_KEY]);
  return id;
}

/** New “seating” / session for stats (clears current-session totals on Insights). */
export async function resetStatsSession(): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await AsyncStorage.setItem(SESSION_ID_KEY, id);
  await AsyncStorage.setItem(SESSION_STARTED_KEY, new Date().toISOString());
  await AsyncStorage.multiRemove([SESSION_CLEARED_BYTES_KEY, SESSION_CLEARED_ITEMS_KEY]);
  return id;
}

export async function getStatsSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_ID_KEY);
}

export async function addToStatsSessionInAppCleared(items: number, bytes: number): Promise<void> {
  if (items <= 0 && bytes <= 0) return;
  const [rawI, rawB] = await Promise.all([
    AsyncStorage.getItem(SESSION_CLEARED_ITEMS_KEY),
    AsyncStorage.getItem(SESSION_CLEARED_BYTES_KEY),
  ]);
  const prevI = parseInt(rawI || '0', 10) || 0;
  const prevB = parseFloat(rawB || '0') || 0;
  await AsyncStorage.multiSet([
    [SESSION_CLEARED_ITEMS_KEY, String(prevI + Math.max(0, items))],
    [SESSION_CLEARED_BYTES_KEY, String(prevB + Math.max(0, bytes))],
  ]);
}

export async function getStatsSessionInAppCleared(): Promise<{ items: number; bytes: number }> {
  const [rawI, rawB] = await Promise.all([
    AsyncStorage.getItem(SESSION_CLEARED_ITEMS_KEY),
    AsyncStorage.getItem(SESSION_CLEARED_BYTES_KEY),
  ]);
  return {
    items: parseInt(rawI || '0', 10) || 0,
    bytes: parseFloat(rawB || '0') || 0,
  };
}
