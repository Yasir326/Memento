// Date helpers for Memento — small, deterministic, and RN-free.
//
// ─── The one rule that matters ────────────────────────────────────────────
//
// There are exactly two kinds of Date in this codebase:
//
//   1. An INSTANT — a real moment in time. Only ever `new Date()` or a
//      value derived from one. Used for countdowns and timers.
//
//   2. A PLAIN DATE — a calendar day with no time and no zone, represented
//      as a Date anchored at UTC midnight. Its *UTC* components (getUTCFullYear,
//      getUTCMonth, getUTCDate) ARE the calendar date. Its local components
//      are meaningless and must never be read.
//
// Every function below takes and returns plain dates unless its name says
// "Instant". `toPlainDate()` is the ONLY bridge from an instant to a plain
// date, and it reads the *local wall clock* — so a user in Auckland at
// 09:00 Monday gets Monday, and a user in Los Angeles at 18:00 Sunday gets
// Sunday, which is what §12 of the design doc means by "ISO-style Monday
// 00:00 in the user's current time zone".
//
// The previous version of this file read UTC components off local Dates,
// which silently rolled the week boundary forward or back by a day for
// every user outside UTC. Hence the explicit split.

/**
 * A calendar day with no time-of-day and no zone, anchored at UTC midnight.
 * Structurally a Date; the alias exists to make intent readable at call sites.
 */
export type PlainDate = Date;

// ─── Bridging instants and plain dates ────────────────────────────────────

/**
 * The calendar day an instant falls on *in the device's local zone*, as a
 * plain date. This is the only sanctioned instant → plain conversion.
 */
export function toPlainDate(instant: Date): PlainDate {
  return new Date(
    Date.UTC(instant.getFullYear(), instant.getMonth(), instant.getDate()),
  );
}

/** Today, in the device's local zone, as a plain date. */
export function todayPlain(now: Date = new Date()): PlainDate {
  return toPlainDate(now);
}

/**
 * Local midnight at the start of a plain date, as an instant. Used when we
 * need to measure real elapsed time toward a calendar boundary (e.g. "how
 * many hours until this week ends"). DST-safe: the local Date constructor
 * resolves the offset in effect on that day.
 */
export function toLocalMidnightInstant(plain: PlainDate): Date {
  return new Date(
    plain.getUTCFullYear(),
    plain.getUTCMonth(),
    plain.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

// ─── Parsing and formatting ───────────────────────────────────────────────

/** Parse an ISO `YYYY-MM-DD` string into a plain date. Throws on garbage. */
export function plainFromISO(iso: string): PlainDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const out = new Date(Date.UTC(year, month - 1, day));
  // Rejects 2025-02-30 and friends, which Date.UTC would silently roll over.
  if (out.getUTCMonth() !== month - 1 || out.getUTCDate() !== day) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return out;
}

/** Format a plain date as `YYYY-MM-DD`. The canonical storage format. */
export function toISODate(plain: PlainDate): string {
  const y = plain.getUTCFullYear();
  const m = String(plain.getUTCMonth() + 1).padStart(2, '0');
  const d = String(plain.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Arithmetic ───────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Whole days from `a` to `b`. Negative if `b` precedes `a`. */
export function daysBetween(a: PlainDate, b: PlainDate): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** Whole weeks (floor) from `a` to `b`. */
export function weeksBetween(a: PlainDate, b: PlainDate): number {
  return Math.floor(daysBetween(a, b) / 7);
}

/** Add whole days to a plain date. */
export function addDays(plain: PlainDate, days: number): PlainDate {
  return new Date(plain.getTime() + days * MS_PER_DAY);
}

/** Add whole months, clamping to the last valid day (31 Jan + 1mo = 28 Feb). */
export function addMonths(plain: PlainDate, months: number): PlainDate {
  const y = plain.getUTCFullYear();
  const m = plain.getUTCMonth() + months;
  const d = plain.getUTCDate();
  const lastDay = daysInMonth(y + Math.floor(m / 12), ((m % 12) + 12) % 12);
  return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
}

/** Add whole years, snapping 29 Feb to 28 Feb in non-leap target years. */
export function safeAddYears(plain: PlainDate, years: number): PlainDate {
  const y = plain.getUTCFullYear() + years;
  const m = plain.getUTCMonth();
  const d = plain.getUTCDate();
  // JS auto-normalises 29 Feb to 1 Mar in non-leap years — we prefer 28 Feb
  // so the projection doesn't drift forward by a day.
  const isFebLeapDay = m === 1 && d === 29;
  const targetDay = isFebLeapDay && !isLeapYear(y) ? 28 : d;
  return new Date(Date.UTC(y, m, targetDay));
}

/**
 * Start of the week containing `plain`, for the given week-start day
 * (0 = Sunday, 1 = Monday — the doc's default).
 */
export function startOfWeek(plain: PlainDate, weekStartsOn: 0 | 1 = 1): PlainDate {
  const dow = plain.getUTCDay();
  const diff = (dow - weekStartsOn + 7) % 7;
  return addDays(plain, -diff);
}

/** Start of the week *after* the one containing `plain`. */
export function nextWeekStart(plain: PlainDate, weekStartsOn: 0 | 1 = 1): PlainDate {
  return addDays(startOfWeek(plain, weekStartsOn), 7);
}

/**
 * Start of the current week in the device's local zone. The single entry
 * point screens should use — it does the instant → plain conversion for you.
 */
export function currentWeekStart(
  weekStartsOn: 0 | 1 = 1,
  now: Date = new Date(),
): PlainDate {
  return startOfWeek(toPlainDate(now), weekStartsOn);
}

/** Zero-based week index within the calendar year containing `plain`. */
export function weekOfYear(plain: PlainDate, weekStartsOn: 0 | 1 = 1): number {
  const jan1 = new Date(Date.UTC(plain.getUTCFullYear(), 0, 1));
  const firstWeekStart = startOfWeek(jan1, weekStartsOn);
  return Math.max(0, weeksBetween(firstWeekStart, startOfWeek(plain, weekStartsOn)));
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Internals ────────────────────────────────────────────────────────────

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
