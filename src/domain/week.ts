// Week-boundary maths for the dashboard countdown.
//
// Doc §15: "Recalculate at app foreground and at the next local day or week
// boundary, not every second." So this module exposes both the numbers to
// display and `nextBoundaryMs`, which the UI uses to schedule exactly one
// timer instead of ticking.
//
// Tone rule (§02): this is a countdown to a calendar boundary, not a timer
// that pressures the user. The copy tops out at days and hours — never
// minutes and seconds — and never uses "running out" language.

import {
  daysBetween,
  nextWeekStart,
  startOfWeek,
  toLocalMidnightInstant,
  toPlainDate,
  weekOfYear,
  type PlainDate,
} from './dates';

export type WeekCountdown = {
  /** Start of the current week. */
  weekStart: PlainDate;
  /** Start of next week — i.e. the moment this week ends. */
  weekEnd: PlainDate;
  /** The instant this week rolls over, in the device's local zone. */
  endsAt: Date;
  /** Whole calendar days from today up to the rollover. 1..7. */
  daysLeft: number;
  /** Whole hours until the rollover. Used when fewer than two days remain. */
  hoursLeft: number;
  /** 0..1 elapsed through the week, measured in real time (DST-aware). */
  progress: number;
  /** ISO week number of the year, 1-based, for "Week 38 of 2026". */
  weekNumber: number;
  /** Calendar year the current week starts in. */
  year: number;
  /** Ready-to-render copy, e.g. "3 days left this week". */
  label: string;
  /**
   * Milliseconds until the display would next change — the next local hour
   * boundary, or the week rollover, whichever comes first. Schedule one
   * timeout against this rather than polling.
   */
  nextBoundaryMs: number;
};

const MS_PER_HOUR = 3_600_000;

export function getWeekCountdown(
  now: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): WeekCountdown {
  const today = toPlainDate(now);
  const weekStart = startOfWeek(today, weekStartsOn);
  const weekEnd = nextWeekStart(today, weekStartsOn);

  // Local midnights, so a DST transition inside the week shortens or
  // lengthens it by an hour exactly as the user experiences it.
  const startsAt = toLocalMidnightInstant(weekStart);
  const endsAt = toLocalMidnightInstant(weekEnd);

  const msLeft = Math.max(0, endsAt.getTime() - now.getTime());
  const spanMs = Math.max(1, endsAt.getTime() - startsAt.getTime());

  const daysLeft = Math.max(1, daysBetween(today, weekEnd));
  const hoursLeft = Math.floor(msLeft / MS_PER_HOUR);
  const progress = Math.min(1, Math.max(0, 1 - msLeft / spanMs));

  const msToNextHour = msLeft % MS_PER_HOUR || MS_PER_HOUR;
  const nextBoundaryMs = Math.max(1000, Math.min(msLeft, msToNextHour));

  return {
    weekStart,
    weekEnd,
    endsAt,
    daysLeft,
    hoursLeft,
    progress,
    weekNumber: weekOfYear(weekStart, weekStartsOn) + 1,
    year: weekStart.getUTCFullYear(),
    label: countdownLabel(daysLeft, hoursLeft),
    nextBoundaryMs,
  };
}

/**
 * Days while there is more than one left; hours on the final day. Deliberately
 * stops at hours — the doc's tone boundaries rule out a ticking clock.
 */
export function countdownLabel(daysLeft: number, hoursLeft: number): string {
  if (daysLeft > 1) {
    return `${daysLeft} days left this week`;
  }
  if (hoursLeft >= 2) {
    return `About ${hoursLeft} hours left this week`;
  }
  if (hoursLeft === 1) {
    return 'About an hour left this week';
  }
  return 'This week ends within the hour';
}

/** Long-form weekday name for the rollover day, e.g. "Monday". */
export function weekEndDayName(countdown: WeekCountdown, locale?: string): string {
  return toLocalMidnightInstant(countdown.weekEnd).toLocaleDateString(locale, {
    weekday: 'long',
  });
}
