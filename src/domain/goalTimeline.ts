// Goal timelines — turning a target date into the week language the rest of
// the product speaks.
//
// Doc §08: "Translate the target date into weeks: '38 weeks left.' Dates
// remain visible in detail view." So the dashboard and goal list lead with
// weeks and keep the date as supporting metadata.
//
// Weeks are measured from the START of the current week, not from today, so
// the number matches the grid: if the grid says you are in week 1,892, a
// goal 38 weeks out lands on dot 1,930. Measuring from today would let the
// two disagree by one for most of the week.

import {
  clamp,
  currentWeekStart,
  daysBetween,
  plainFromISO,
  startOfWeek,
  toPlainDate,
  weeksBetween,
  type PlainDate,
} from './dates';

export type GoalTimelineInput = {
  /** ISO YYYY-MM-DD target date. */
  targetDate: string;
  /** ISO datetime the goal was created — anchors the elapsed-time bar. */
  createdAt?: string | null;
};

export type GoalTimeline = {
  target: PlainDate;
  /** Whole weeks from the start of this week to the target week. */
  weeksRemaining: number;
  /** Whole days from today to the target. Negative once the date passes. */
  daysRemaining: number;
  /** Target falls inside the current week. */
  isDueThisWeek: boolean;
  /** Target has passed and the goal is still open. */
  isOverdue: boolean;
  /** 0..1 elapsed between creation and target. Drives the thin progress line. */
  elapsed: number;
  /** Ready-to-render copy, e.g. "38 weeks left". */
  label: string;
};

export function getGoalTimeline(
  input: GoalTimelineInput,
  now: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): GoalTimeline {
  const target = plainFromISO(input.targetDate);
  const today = toPlainDate(now);
  const thisWeek = currentWeekStart(weekStartsOn, now);
  const targetWeek = startOfWeek(target, weekStartsOn);

  const weeksRemaining = weeksBetween(thisWeek, targetWeek);
  const daysRemaining = daysBetween(today, target);
  const isDueThisWeek = weeksRemaining === 0 && daysRemaining >= 0;
  const isOverdue = daysRemaining < 0;

  // Elapsed runs from goal creation to target. Without a creation date we
  // have no baseline, so the line stays empty rather than inventing one.
  let elapsed = 0;
  if (input.createdAt) {
    const created = toPlainDate(new Date(input.createdAt));
    const span = daysBetween(created, target);
    elapsed = span > 0 ? clamp(daysBetween(created, today) / span, 0, 1) : 1;
  }

  return {
    target,
    weeksRemaining,
    daysRemaining,
    isDueThisWeek,
    isOverdue,
    elapsed,
    label: timelineLabel(weeksRemaining, daysRemaining),
  };
}

function timelineLabel(weeksRemaining: number, daysRemaining: number): string {
  if (daysRemaining < 0) {
    const weeksPast = Math.abs(weeksRemaining);
    if (weeksPast >= 1) return `Target passed ${weeksPast} ${plural(weeksPast, 'week')} ago`;
    return 'Target date has passed';
  }
  if (weeksRemaining === 0) return 'Due this week';
  if (weeksRemaining === 1) return '1 week left';
  return `${weeksRemaining.toLocaleString()} weeks left`;
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/** Medium-form target date for supporting metadata, e.g. "12 March 2027". */
export function formatTargetDate(target: PlainDate, locale?: string): string {
  return new Date(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  ).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
