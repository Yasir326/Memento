// Date helpers for Memento — kept intentionally small.
//
// The design doc calls for Temporal-style PlainDate handling to avoid
// timestamp errors around DST, leap years, and time zones. For this slice
// we use plain UTC-anchored Date objects and derive day-only fields, which
// is enough for the life-grid math. A future slice should replace these
// with @js-temporal/polyfill so week arithmetic stays deterministic across
// zones — flagged in a TODO at the bottom of the file.

/** Difference in whole days (floor) between two dates. UTC-anchored. */
export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((utcB - utcA) / MS_PER_DAY);
}

/**
 * Start of the ISO week containing `date`, at 00:00 in the given weekStartsOn
 * (0 = Sunday, 1 = Monday). The doc specifies Monday as default; UserSettings
 * lets a user override later. Returns a UTC-anchored Date at midnight.
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();
  const diff = (dow - weekStartsOn + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/** Add whole years to a date, snapping 29 Feb to 28 Feb on non-leap years. */
export function safeAddYears(date: Date, years: number): Date {
  const y = date.getUTCFullYear() + years;
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  // JS auto-normalises 29 Feb to 1 Mar in non-leap years — we prefer 28 Feb
  // so the projection doesn't drift forward by a day.
  const isFebLeap = m === 1 && d === 29;
  const targetDay = isFebLeap && !isLeapYear(y) ? 28 : d;
  return new Date(Date.UTC(y, m, targetDay));
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whole weeks (floor) between two dates. */
export function weeksBetween(a: Date, b: Date): number {
  return Math.floor(daysBetween(a, b) / 7);
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// TODO(temporal): once the app persists user data, swap the plain-Date
// helpers here for @js-temporal/polyfill PlainDate/PlainDateTime helpers.
// The public function shapes will stay identical; the internals become
// zone-safe. Section 12 of the design doc names this explicitly.
