import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../(tabs)/supabase';
import { addToStatsSessionInAppCleared, getStatsSessionInAppCleared } from './statsSession';

/** Bytes/items not yet reflected in Supabase (RPC + row update both failed). */
const PENDING_STATS_BYTES = '@dumpit_stats_pending_cloud_bytes';
const PENDING_STATS_ITEMS = '@dumpit_stats_pending_cloud_items';

async function getPendingCloudMirror(): Promise<{ bytes: number; items: number }> {
  const [[, b], [, i]] = await AsyncStorage.multiGet([PENDING_STATS_BYTES, PENDING_STATS_ITEMS]);
  return { bytes: parseFloat(b || '0') || 0, items: parseInt(i || '0', 10) || 0 };
}

async function addPendingCloudMirror(bytes: number, items: number): Promise<void> {
  if (bytes <= 0 && items <= 0) return;
  const p = await getPendingCloudMirror();
  await AsyncStorage.multiSet([
    [PENDING_STATS_BYTES, String(p.bytes + Math.max(0, bytes))],
    [PENDING_STATS_ITEMS, String(p.items + Math.max(0, items))],
  ]);
}

export type UserStatsSource = 'dump' | 'insights' | 'supercut';

export async function resolveAuthUserId(fallbackUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user?.id) return data.user.id;
  } catch {
    /* ignore */
  }
  return fallbackUserId || null;
}

/** Row shape for aggregated `public.user_stats` (PK user_id). */
export type UserStatsAggregateRow = {
  user_id: string;
  total_photos_deleted: number;
  total_photos_kept: number;
  total_storage_freed_mb: number;
  total_sessions: number;
  longest_streak_days: number;
  current_streak_days: number;
  last_session_at: string | null;
  updated_at: string;
};

/** Estimated bytes from width × height (photos) or duration (video). */
export function estimateAssetBytes(a: {
  mediaType: string;
  width: number;
  height: number;
  duration?: number;
}): number {
  if (a.mediaType === 'video') {
    const sec = Math.max(0.5, a.duration ?? 1);
    return Math.round(sec * 1.5 * 1024 * 1024);
  }
  return Math.round(a.width * a.height * 0.45);
}

async function incrementUserStatsFallback(uid: string, items: number, mbDelta: number): Promise<boolean> {
  const iso = new Date().toISOString();
  const { data: existing, error: selErr } = await supabase
    .from('user_stats')
    .select(
      'user_id, total_photos_deleted, total_storage_freed_mb, total_photos_kept, total_sessions, longest_streak_days, current_streak_days',
    )
    .eq('user_id', uid)
    .maybeSingle();
  if (selErr) {
    console.warn('[user_stats] read before update failed', selErr.message);
    return false;
  }
  if (existing) {
    const nextDel = (Number(existing.total_photos_deleted) || 0) + items;
    const nextMb = parseFloat(String(existing.total_storage_freed_mb ?? 0)) + mbDelta;
    const { error: upErr } = await supabase
      .from('user_stats')
      .update({
        total_photos_deleted: nextDel,
        total_storage_freed_mb: nextMb,
        last_session_at: iso,
        updated_at: iso,
      })
      .eq('user_id', uid);
    if (upErr) {
      console.warn('[user_stats] update failed', upErr.message, upErr.code ?? '');
      return false;
    }
    return true;
  }
  const { error: insErr } = await supabase.from('user_stats').insert({
    user_id: uid,
    total_photos_deleted: items,
    total_photos_kept: 0,
    total_storage_freed_mb: mbDelta,
    total_sessions: 0,
    longest_streak_days: 0,
    current_streak_days: 0,
    last_session_at: iso,
    updated_at: iso,
  });
  if (insErr) {
    console.warn('[user_stats] insert failed', insErr.message, insErr.code ?? '');
    return false;
  }
  return true;
}

/** Ensures one stats row exists so increments can apply (FK must allow auth user → profiles). */
async function ensureUserStatsRow(uid: string): Promise<void> {
  const { data: row, error: selErr } = await supabase.from('user_stats').select('user_id').eq('user_id', uid).maybeSingle();
  if (selErr || row) return;
  const iso = new Date().toISOString();
  const { error: insErr } = await supabase.from('user_stats').insert({
    user_id: uid,
    total_photos_deleted: 0,
    total_photos_kept: 0,
    total_storage_freed_mb: 0,
    total_sessions: 0,
    longest_streak_days: 0,
    current_streak_days: 0,
    last_session_at: null,
    updated_at: iso,
  });
  if (insErr && !/duplicate|unique/i.test(insErr.message)) {
    console.warn('[user_stats] ensure row failed', insErr.message);
  }
}

export async function recordUserStatsDeletion(params: {
  userId: string;
  itemsCount: number;
  bytesCleared: number;
  source: UserStatsSource;
}): Promise<void> {
  if (params.itemsCount <= 0) return;
  const bytes = Math.max(0, Math.round(params.bytesCleared));
  const uid = await resolveAuthUserId(params.userId);
  if (!uid) {
    console.warn('[user_stats] skip: no authenticated user');
    return;
  }
  const mbDelta = bytes / (1024 * 1024);

  await addToStatsSessionInAppCleared(params.itemsCount, bytes);

  const { error: rpcErr } = await supabase.rpc('increment_user_stats', {
    p_photos_deleted: params.itemsCount,
    p_storage_mb_delta: mbDelta,
  });
  if (!rpcErr) return;

  const ok = await incrementUserStatsFallback(uid, params.itemsCount, mbDelta);
  if (!ok) {
    await addPendingCloudMirror(bytes, params.itemsCount);
  }
}

export async function fetchUserStatsAggregate(userId: string): Promise<UserStatsAggregateRow | null> {
  const uid = await resolveAuthUserId(userId);
  if (!uid) return null;
  const { data, error } = await supabase
    .from('user_stats')
    .select(
      'user_id, total_photos_deleted, total_photos_kept, total_storage_freed_mb, total_sessions, longest_streak_days, current_streak_days, last_session_at, updated_at',
    )
    .eq('user_id', uid)
    .maybeSingle();
  if (error) {
    console.warn('[user_stats] fetch aggregate failed', error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const mbRaw = parseFloat(String(r.total_storage_freed_mb ?? '0'));
  const mb = Number.isFinite(mbRaw) ? mbRaw : 0;
  return {
    user_id: String(r.user_id),
    total_photos_deleted: Number(r.total_photos_deleted) || 0,
    total_photos_kept: Number(r.total_photos_kept) || 0,
    total_storage_freed_mb: mb,
    total_sessions: Number(r.total_sessions) || 0,
    longest_streak_days: Number(r.longest_streak_days) || 0,
    current_streak_days: Number(r.current_streak_days) || 0,
    last_session_at: r.last_session_at != null ? String(r.last_session_at) : null,
    updated_at: String(r.updated_at ?? ''),
  };
}

/** All-time from Supabase row; session totals from local device (this “Insights session”). */
export async function fetchUserStatsTotals(userId: string, _currentSessionId: string | null): Promise<{
  allTimeBytes: number;
  allTimeItems: number;
  sessionBytes: number;
  sessionItems: number;
}> {
  const session = await getStatsSessionInAppCleared();
  const uid = await resolveAuthUserId(userId);
  const pending = await getPendingCloudMirror();
  if (uid) await ensureUserStatsRow(uid);

  const row = uid ? await fetchUserStatsAggregate(userId) : null;
  const cloudBytes = row ? Math.round(row.total_storage_freed_mb * 1024 * 1024) : 0;
  const cloudItems = row ? row.total_photos_deleted : 0;
  const allTimeBytes = cloudBytes + pending.bytes;
  const allTimeItems = cloudItems + pending.items;

  return {
    allTimeBytes,
    allTimeItems,
    sessionBytes: session.bytes,
    sessionItems: session.items,
  };
}
