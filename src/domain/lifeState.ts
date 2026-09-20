// Life state derivation — the core domain calculation behind the grid.
//
// Given a birth date and a user-selected projection age, computes the
// numbers every time-facing screen displays: weeks lived, weeks remaining,
// progress through the horizon, and which grid index is "this week".
//
// The doc's tone rule applies to everything here (p.3): the output is an
// ESTIMATE against a planning horizon the user picked. It is not a
// prediction, and UI copy must never present it as one.
//
// Stability guarantee: `totalWeeks` is derived from birth date and
// projection age ONLY. It does not depend on today, so the grid never
// changes size under the user. When a new week begins, `livedWeeks` goes up
// by exactly one, `remainingWeeks` goes down by exactly one, and
// `currentWeekIndex` advances one dot. That is the whole week-rollover
// behaviour — there are no timers to replay and no stored week records.

import {
  clamp,
  currentWeekStart as currentWeekStartFor,
  daysBetween,
  plainFromISO,
  safeAddYears,
  startOfWeek,
  toPlainDate,
  weeksBetween,
  type PlainDate,
} from './dates';

export type LifeProjection = {
  /** ISO date string (YYYY-MM-DD) — day-only, no timestamp. */
  birthDate: string;
  /** Planning horizon in years (doc default: 85). */
  projectedAge: number;
  /** Week-start day. 0 = Sunday, 1 = Monday (doc default). */
  weekStartsOn?: 0 | 1;
};

export type LifeState = {
  /** Whole weeks completed between birth and the start of THIS week. */
  livedWeeks: number;
  /** Whole weeks from the start of THIS week to the projection end. */
  remainingWeeks: number;
  /** Total dots in the grid. Independent of today — see note above. */
  totalWeeks: number;
  /**
   * Index of the current-week dot, or -1 when today is past the projection
   * horizon (in which case the grid is entirely elapsed and no dot pulses).
   */
  currentWeekIndex: number;
  /** 0..1 progress through the projected horizon, measured in days. */
  progress: number;
  /** Start date of the current week. */
  currentWeekStart: PlainDate;
  /** The projection horizon's end date. */
  projectionEnd: PlainDate;
  /** Whole years from birth to today. */
  ageYears: number;
  /** True when today is at or past the projection end. */
  isPastProjection: boolean;
};

/**
 * @param input  birth date + horizon
 * @param now    an INSTANT (default: right now). Not a plain date — this
 *               function does the local-zone conversion itself.
 */
export function getLifeState(input: LifeProjection, now: Date = new Date()): LifeState {
  const { birthDate, projectedAge, weekStartsOn = 1 } = input;

  const birth = plainFromISO(birthDate);
  const projectionEnd = safeAddYears(birth, projectedAge);
  const today = toPlainDate(now);
  const currentWeekStart = currentWeekStartFor(weekStartsOn, now);

  // Every count below is an index on ONE week lattice, anchored to the week
  // containing the birth date. This matters more than it looks: counting
  // lived weeks from the birth DATE while counting remaining weeks from the
  // CURRENT WEEK START measures on two different 7-day grids, and the two
  // floors disagree by one for most birth dates — so the headline numbers
  // would not add up to the number of dots on screen.
  const birthWeek = startOfWeek(birth, weekStartsOn);

  /** Dot index of the week containing `date`. */
  const weekIndexOf = (date: PlainDate) =>
    weeksBetween(birthWeek, startOfWeek(date, weekStartsOn));

  // The grid's size: every week from birth to the horizon, inclusive of the
  // week the horizon falls in. Depends on birth + projection only, never on
  // today, so the grid never resizes under the user.
  const totalWeeks = Math.max(1, weekIndexOf(projectionEnd) + 1);

  // livedWeeks counts fully-elapsed weeks before the week containing today.
  // Doc rule: the current week is neither elapsed nor future.
  const livedWeeks = clamp(weekIndexOf(currentWeekStart), 0, totalWeeks);
  const isPastProjection = today.getTime() >= projectionEnd.getTime();
  const currentWeekIndex = livedWeeks < totalWeeks ? livedWeeks : -1;
  // Derived rather than measured, which is what guarantees
  // lived + current + remaining === totalWeeks in every case.
  const remainingWeeks = Math.max(0, totalWeeks - livedWeeks - 1);

  // Progress is a fraction of days (not weeks) so it doesn't jump at week
  // boundaries. Clamped so it stays visually sane past the horizon.
  const totalDays = daysBetween(birth, projectionEnd);
  const livedDays = daysBetween(birth, today);
  const progress = totalDays > 0 ? clamp(livedDays / totalDays, 0, 1) : 0;

  return {
    livedWeeks,
    remainingWeeks,
    totalWeeks,
    currentWeekIndex,
    progress,
    currentWeekStart,
    projectionEnd,
    ageYears: wholeYearsBetween(birth, today),
    isPastProjection,
  };
}

/** Whole years elapsed from `from` to `to`, birthday-aware. */
export function wholeYearsBetween(from: PlainDate, to: PlainDate): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeBirthday =
    to.getUTCMonth() < from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  if (beforeBirthday) years -= 1;
  return Math.max(0, years);
}
