import AsyncStorage from '@react-native-async-storage/async-storage';

export const STREAK_KEYS = {
  current: '@swipeclean_streak_current',
  best: '@swipeclean_streak_best',
  lastActive: '@swipeclean_last_active_ymd',
  streakDays: '@swipeclean_streak_days',
} as const;

/** `yyyy-mm` → local calendar day-of-month numbers with activity */
export type StreakDaysMap = Record<string, number[]>;

export interface StreakState {
  current: number;
  best: number;
  lastActiveYmd: string | null;
  streakDays: StreakDaysMap;
}

export function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, mo, da] = ymd.split('-').map(Number);
  const dt = new Date(y, mo - 1, da + deltaDays);
  return localYmd(dt);
}

function monthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function addActiveDayToMap(streakDays: StreakDaysMap, ymd: string): StreakDaysMap {
  const mk = monthKeyFromYmd(ymd);
  const dayNum = parseInt(ymd.slice(8, 10), 10);
  if (Number.isNaN(dayNum)) return streakDays;
  const prev = streakDays[mk] ?? [];
  if (prev.includes(dayNum)) return streakDays;
  const next = [...prev, dayNum].sort((a, b) => a - b);
  return { ...streakDays, [mk]: next };
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function loadStreakState(): Promise<StreakState> {
  const [c, b, l, raw] = await Promise.all([
    AsyncStorage.getItem(STREAK_KEYS.current),
    AsyncStorage.getItem(STREAK_KEYS.best),
    AsyncStorage.getItem(STREAK_KEYS.lastActive),
    AsyncStorage.getItem(STREAK_KEYS.streakDays),
  ]);
  let streakDays: StreakDaysMap = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        streakDays = parsed as StreakDaysMap;
      }
    } catch {
      streakDays = {};
    }
  }
  return {
    current: parsePositiveInt(c, 0),
    best: parsePositiveInt(b, 0),
    lastActiveYmd: l && /^\d{4}-\d{2}-\d{2}$/.test(l) ? l : null,
    streakDays,
  };
}

async function persistStreakState(
  current: number,
  best: number,
  lastActiveYmd: string,
  streakDays: StreakDaysMap,
): Promise<void> {
  await AsyncStorage.multiSet([
    [STREAK_KEYS.current, String(current)],
    [STREAK_KEYS.best, String(best)],
    [STREAK_KEYS.lastActive, lastActiveYmd],
    [STREAK_KEYS.streakDays, JSON.stringify(streakDays)],
  ]);
}

/** Core open-day bookkeeping; call only through `recordDailyOpen` queue. */
async function recordDailyOpenImpl(): Promise<void> {
  const today = localYmd();
  const state = await loadStreakState();
  const { lastActiveYmd } = state;
  let current = state.current;
  let best = state.best;
  let streakDays = state.streakDays;

  if (lastActiveYmd === today) {
    streakDays = addActiveDayToMap(streakDays, today);
    await AsyncStorage.setItem(STREAK_KEYS.streakDays, JSON.stringify(streakDays));
    return;
  }

  const yesterday = addCalendarDaysYmd(today, -1);
  let newCurrent: number;

  if (lastActiveYmd && lastActiveYmd > today) {
    newCurrent = 1;
  } else if (!lastActiveYmd || lastActiveYmd < yesterday) {
    newCurrent = 1;
  } else if (lastActiveYmd === yesterday) {
    const base = Math.max(1, current || 0);
    newCurrent = base + 1;
  } else {
    newCurrent = 1;
  }

  best = Math.max(best, newCurrent);
  streakDays = addActiveDayToMap(streakDays, today);
  await persistStreakState(newCurrent, best, today, streakDays);
}

/** Serialize updates so parallel callers (e.g. React Strict Mode) never double-apply. */
let recordChain: Promise<void> = Promise.resolve();

export function recordDailyOpen(): Promise<void> {
  const run = recordChain.then(() => recordDailyOpenImpl());
  recordChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}
