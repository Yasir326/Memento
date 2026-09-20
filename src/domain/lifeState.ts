// Life state derivation — the core domain calculation for Memento's grid.
//
// Given a birth date and a user-selected projection age, computes:
//   - lived weeks (whole weeks completed between birth and today)
//   - remaining weeks (estimated weeks from the current week to projection end)
//   - progress fraction (0..1) through the projected horizon
//   - the current-week start date (used to key the "amber" dot in the grid)
//
// The doc's tone-boundary rule applies here: the output is an ESTIMATE, not a
// prediction. Never call this a death date, never call remainingWeeks "weeks
// left" in UI copy that could read as fatalistic. See tone-boundaries table
// on p.3.

import { clamp, daysBetween, safeAddYears, startOfWeek, weeksBetween } from './dates';

export type LifeProjection = {
  /** ISO date string (YYYY-MM-DD) — day-only, no timestamp. */
  birthDate: string;
  /** Planning horizon in years (doc default: 85). */
  projectedAge: number;
  /** ISO week-start day. 0 = Sunday, 1 = Monday (doc default). */
  weekStartsOn?: 0 | 1;
};

export type LifeState = {
  /** Whole weeks completed between birth and the start of THIS week. */
  livedWeeks: number;
  /** Whole weeks from the start of THIS week to the projection end. */
  remainingWeeks: number;
  /** 0..1 progress through the projected horizon. */
  progress: number;
  /** Start date of the current week (UTC-anchored, 00:00). */
  currentWeekStart: Date;
  /** Total projected weeks (livedWeeks + 1 current + remainingWeeks). */
  totalWeeks: number;
};

export function getLifeState(input: LifeProjection, today: Date = new Date()): LifeState {
  const { birthDate, projectedAge, weekStartsOn = 1 } = input;

  const start = parseISODate(birthDate);
  const end = safeAddYears(start, projectedAge);
  const currentWeekStart = startOfWeek(today, weekStartsOn);

  // livedWeeks counts fully-elapsed weeks up to (but not including) the
  // week containing today. Doc rule: the current week is neither elapsed
  // nor future.
  const livedWeeks = Math.max(0, weeksBetween(start, currentWeekStart));
  const remainingWeeks = Math.max(0, weeksBetween(currentWeekStart, end));
  const totalWeeks = livedWeeks + 1 + remainingWeeks;

  // Progress is a smoothed fraction of days (not weeks) so it doesn't jump
  // at week boundaries. Clamp keeps it visually sane past the projection.
  const totalDays = daysBetween(start, end);
  const livedDays = daysBetween(start, today);
  const progress = totalDays > 0 ? clamp(livedDays / totalDays, 0, 1) : 0;

  return {
    livedWeeks,
    remainingWeeks,
    progress,
    currentWeekStart,
    totalWeeks,
  };
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return new Date(Date.UTC(y, m - 1, d));
}
