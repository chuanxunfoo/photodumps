import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../(tabs)/ThemeContext';
import { StreakHeroBanner } from './streak/StreakHeroBanner';
import { STREAK_FIRE_THRESHOLD, StreakFire } from './streak/StreakFire';
import {
  daysInMonth,
  loadStreakState,
  localYmd,
  type StreakDaysMap,
} from '../_lib/streakLogic';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function monthKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

function isAfterCalendarMonth(year: number, month1: number, cap: Date): boolean {
  const cy = cap.getFullYear();
  const cm = cap.getMonth() + 1;
  return year * 12 + month1 > cy * 12 + cm;
}

function stepMonth(year: number, month1: number, delta: number): { y: number; m1: number } {
  const d = new Date(year, month1 - 1 + delta, 1);
  return { y: d.getFullYear(), m1: d.getMonth() + 1 };
}

export function StreakCalendarContent() {
  const { theme } = useTheme();
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth1, setViewMonth1] = useState(now.getMonth() + 1);
  const [current, setCurrent] = useState(0);
  const [best, setBest] = useState(0);
  const [streakDays, setStreakDays] = useState<StreakDaysMap>({});

  const refresh = useCallback(async () => {
    const s = await loadStreakState();
    setCurrent(Math.max(0, s.current));
    setBest(Math.max(0, s.best));
    setStreakDays(s.streakDays);
  }, []);

  useEffect(() => {
    refresh();
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth1(d.getMonth() + 1);
  }, [refresh]);

  const todayYmd = localYmd(now);
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const cd = now.getDate();

  const mk = monthKey(viewYear, viewMonth1);
  const activeSet = useMemo(() => new Set(streakDays[mk] ?? []), [streakDays, mk]);

  const dim = daysInMonth(viewYear, viewMonth1 - 1);
  const firstDow = new Date(viewYear, viewMonth1 - 1, 1).getDay();
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const goPrev = () => {
    const { y, m1 } = stepMonth(viewYear, viewMonth1, -1);
    setViewYear(y);
    setViewMonth1(m1);
  };

  const goNext = () => {
    const { y, m1 } = stepMonth(viewYear, viewMonth1, 1);
    if (isAfterCalendarMonth(y, m1, now)) return;
    setViewYear(y);
    setViewMonth1(m1);
  };

  const { y: nextY, m1: nextM } = stepMonth(viewYear, viewMonth1, 1);
  const nextDisabled = isAfterCalendarMonth(nextY, nextM, now);

  const monthTitle = new Date(viewYear, viewMonth1 - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const onFire = current >= STREAK_FIRE_THRESHOLD;

  return (
    <View style={styles.wrap}>
      <StreakHeroBanner streak={current} best={best} />

      <View style={styles.monthNav}>
        <Pressable
          onPress={goPrev}
          hitSlop={12}
          style={[styles.navBtn, { borderColor: theme.border }]}
          accessibilityLabel="Previous month"
        >
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: theme.text }]}>{monthTitle}</Text>
        <Pressable
          onPress={goNext}
          disabled={nextDisabled}
          hitSlop={12}
          style={[
            styles.navBtn,
            { borderColor: theme.border, opacity: nextDisabled ? 0.35 : 1 },
          ]}
          accessibilityLabel="Next month"
        >
          <ChevronRight size={22} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEK.map((w, i) => (
          <View key={`${w}-${i}`} style={styles.weekCellWrap}>
            <Text style={[styles.weekCell, { color: theme.textMuted }]}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={`e-${idx}`} style={styles.dayCell} />;
          }
          const { day } = cell;
          const isToday = viewYear === cy && viewMonth1 === cm && day === cd;
          const isActive = activeSet.has(day);
          const ymd = `${viewYear}-${String(viewMonth1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const futureDay = ymd > todayYmd;

          return (
            <View key={`d-${day}`} style={styles.dayCell}>
              <View
                style={[
                  styles.dayInner,
                  isToday && { borderColor: theme.accent, borderWidth: 2 },
                  isActive && !isToday && { backgroundColor: theme.accentSoft },
                  futureDay && { opacity: 0.35 },
                ]}
              >
                {isActive && onFire && isToday ? (
                  <View style={styles.dayFire}>
                    <StreakFire size={14} color={theme.accent} active />
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.dayTxt,
                    { color: isToday ? theme.accent : theme.text },
                    isActive && { fontWeight: '800' },
                  ]}
                >
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingHorizontal: 8, paddingTop: 8 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
    width: '100%',
  },
  weekCellWrap: {
    flex: 1,
    alignItems: 'center',
  },
  weekCell: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 18,
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    maxHeight: 48,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  dayTxt: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayFire: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
});
