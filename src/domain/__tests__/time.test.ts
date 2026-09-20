// Domain tests. `src/domain` is deterministic and RN-free by design, so it
// runs under plain Node with the built-in test runner — no test host, no
// jest transform, no simulator.
//
//   npm run test:domain
//
// Several cases pin behaviour that used to be wrong: week boundaries were
// computed from UTC calendar components, which shifted the current week by
// a day for anyone east or west of UTC. The timezone cases below fail
// against that implementation.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addMonths,
  currentWeekStart,
  daysBetween,
  plainFromISO,
  safeAddYears,
  startOfWeek,
  toISODate,
  toPlainDate,
  weekOfYear,
  weeksBetween,
} from '../dates';
import { getLifeState } from '../lifeState';
import { getWeekCountdown } from '../week';
import { getGoalTimeline } from '../goalTimeline';

/** A local wall-clock instant, immune to the host's UTC offset. */
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0);

describe('dates', () => {
  it('reads the local calendar day, not the UTC one', () => {
    // 20 Sep 2026, 23:30 local. In any zone ahead of UTC this instant is
    // already the 21st in UTC; in any zone behind it is still the 20th.
    // The plain date must follow the wall clock either way.
    assert.equal(toISODate(toPlainDate(at(2026, 9, 20, 23, 30))), '2026-09-20');
    assert.equal(toISODate(toPlainDate(at(2026, 9, 20, 0, 30))), '2026-09-20');
  });

  it('starts the week on Monday by default', () => {
    // 2026-09-20 is a Sunday; its Monday is the 14th.
    assert.equal(toISODate(startOfWeek(plainFromISO('2026-09-20'))), '2026-09-14');
    // With Sunday as the week start, the same day begins its own week.
    assert.equal(toISODate(startOfWeek(plainFromISO('2026-09-20'), 0)), '2026-09-20');
  });

  it('puts a late-Sunday-evening user in the week that has not ended yet', () => {
    // The regression this guards: at 23:00 Sunday in UTC+2, UTC has already
    // rolled to Monday, so a UTC-based week start would jump the user a
    // week early and silently drop a dot from the grid.
    const sundayNight = at(2026, 9, 20, 23, 0);
    assert.equal(toISODate(currentWeekStart(1, sundayNight)), '2026-09-14');
  });

  it('counts whole days and weeks', () => {
    assert.equal(daysBetween(plainFromISO('2026-01-01'), plainFromISO('2026-01-08')), 7);
    assert.equal(weeksBetween(plainFromISO('2026-01-01'), plainFromISO('2026-01-08')), 1);
    assert.equal(weeksBetween(plainFromISO('2026-01-01'), plainFromISO('2026-01-07')), 0);
    assert.equal(daysBetween(plainFromISO('2026-01-08'), plainFromISO('2026-01-01')), -7);
  });

  it('crosses a DST boundary without losing a day', () => {
    // Europe/London springs forward on 29 March 2026. A naive ms/86400000
    // division across that boundary yields 6.958 days and floors to 6.
    assert.equal(daysBetween(plainFromISO('2026-03-25'), plainFromISO('2026-04-01')), 7);
  });

  it('snaps 29 February to 28 February in non-leap target years', () => {
    assert.equal(toISODate(safeAddYears(plainFromISO('2004-02-29'), 85)), '2089-02-28');
    assert.equal(toISODate(safeAddYears(plainFromISO('2004-02-29'), 80)), '2084-02-29');
  });

  it('clamps month overflow instead of rolling into the next month', () => {
    assert.equal(toISODate(addMonths(plainFromISO('2026-01-31'), 1)), '2026-02-28');
    assert.equal(toISODate(addMonths(plainFromISO('2024-01-31'), 1)), '2024-02-29');
    assert.equal(toISODate(addMonths(plainFromISO('2026-08-31'), 3)), '2026-11-30');
  });

  it('rejects malformed and impossible ISO dates', () => {
    assert.throws(() => plainFromISO('2026-02-30'));
    assert.throws(() => plainFromISO('2026-13-01'));
    assert.throws(() => plainFromISO('not-a-date'));
  });

  it('numbers weeks within the year', () => {
    assert.equal(weekOfYear(plainFromISO('2026-01-01')), 0);
    assert.equal(weekOfYear(plainFromISO('2026-09-14')), 37);
  });
});

describe('life state', () => {
  const projection = { birthDate: '1990-03-12', projectedAge: 85, weekStartsOn: 1 as const };

  it('splits the horizon into lived, current and remaining', () => {
    const s = getLifeState(projection, at(2026, 9, 20));
    assert.equal(s.livedWeeks + 1 + s.remainingWeeks, s.totalWeeks);
    assert.equal(s.currentWeekIndex, s.livedWeeks);
    assert.ok(s.progress > 0.4 && s.progress < 0.45);
    assert.equal(s.ageYears, 36);
  });

  it('advances exactly one dot when a new week begins', () => {
    // Sunday 23:59 → Monday 00:01, i.e. across the week boundary.
    const before = getLifeState(projection, at(2026, 9, 20, 23, 59));
    const after = getLifeState(projection, at(2026, 9, 21, 0, 1));

    assert.equal(after.livedWeeks, before.livedWeeks + 1);
    assert.equal(after.remainingWeeks, before.remainingWeeks - 1);
    assert.equal(after.currentWeekIndex, before.currentWeekIndex + 1);
    // The grid must not resize under the user.
    assert.equal(after.totalWeeks, before.totalWeeks);
  });

  it('keeps the grid the same size all year', () => {
    const sizes = new Set<number>();
    for (let week = 0; week < 52; week++) {
      const day = new Date(at(2026, 1, 5).getTime() + week * 7 * 86_400_000);
      sizes.add(getLifeState(projection, day).totalWeeks);
    }
    assert.equal(sizes.size, 1);
  });

  it('holds together for a newborn', () => {
    const s = getLifeState(
      { birthDate: '2026-09-18', projectedAge: 85 },
      at(2026, 9, 20),
    );
    assert.equal(s.livedWeeks, 0);
    assert.equal(s.currentWeekIndex, 0);
    assert.equal(s.progress < 0.001, true);
  });

  it('fills the grid and drops the current dot past the horizon', () => {
    const s = getLifeState(
      { birthDate: '1900-01-01', projectedAge: 85 },
      at(2026, 9, 20),
    );
    assert.equal(s.isPastProjection, true);
    assert.equal(s.remainingWeeks, 0);
    assert.equal(s.livedWeeks, s.totalWeeks);
    assert.equal(s.currentWeekIndex, -1);
  });

  it('survives a 1-year and a 120-year horizon', () => {
    for (const projectedAge of [1, 120]) {
      const s = getLifeState({ birthDate: '2000-06-15', projectedAge }, at(2026, 9, 20));
      assert.ok(s.totalWeeks > 0);
      assert.ok(s.livedWeeks <= s.totalWeeks);
    }
  });
});

describe('week countdown', () => {
  it('counts days down through the week', () => {
    // Monday: the whole week is ahead.
    const monday = getWeekCountdown(at(2026, 9, 14, 9), 1);
    assert.equal(monday.daysLeft, 7);
    assert.equal(monday.label, '7 days left this week');
    assert.ok(monday.progress < 0.1);

    // Friday: Friday, Saturday, Sunday remain.
    const friday = getWeekCountdown(at(2026, 9, 18, 9), 1);
    assert.equal(friday.daysLeft, 3);
    assert.equal(friday.label, '3 days left this week');
  });

  it('switches to hours on the final day', () => {
    const sunday = getWeekCountdown(at(2026, 9, 20, 18), 1);
    assert.equal(sunday.daysLeft, 1);
    assert.equal(sunday.hoursLeft, 6);
    assert.equal(sunday.label, 'About 6 hours left this week');
  });

  it('never presents a ticking clock', () => {
    const almostOver = getWeekCountdown(at(2026, 9, 20, 23, 40), 1);
    assert.equal(almostOver.label, 'This week ends within the hour');
    assert.ok(almostOver.progress > 0.99);
  });

  it('schedules the next wake-up at an hour boundary, never below a second', () => {
    const c = getWeekCountdown(at(2026, 9, 18, 9, 30), 1);
    assert.ok(c.nextBoundaryMs >= 1000);
    assert.ok(c.nextBoundaryMs <= 3_600_000);
    // 09:30 → the display changes on the hour, 30 minutes away.
    assert.equal(c.nextBoundaryMs, 30 * 60 * 1000);
  });

  it('reports the ISO-style week number', () => {
    const c = getWeekCountdown(at(2026, 9, 20, 9), 1);
    assert.equal(c.weekNumber, 38);
    assert.equal(c.year, 2026);
  });
});

describe('goal timelines', () => {
  it('measures weeks from the start of the current week', () => {
    // Measuring from today would give a different answer on Wednesday than
    // on Monday for the same goal; measuring from the week start does not.
    const monday = getGoalTimeline({ targetDate: '2027-06-14' }, at(2026, 9, 14), 1);
    const wednesday = getGoalTimeline({ targetDate: '2027-06-14' }, at(2026, 9, 16), 1);
    assert.equal(monday.weeksRemaining, wednesday.weeksRemaining);
    assert.equal(monday.label, `${monday.weeksRemaining} weeks left`);
  });

  it('flags a target inside the current week', () => {
    const t = getGoalTimeline({ targetDate: '2026-09-18' }, at(2026, 9, 16), 1);
    assert.equal(t.isDueThisWeek, true);
    assert.equal(t.isOverdue, false);
    assert.equal(t.label, 'Due this week');
  });

  it('flags a passed target without shaming language', () => {
    const t = getGoalTimeline({ targetDate: '2026-06-01' }, at(2026, 9, 20), 1);
    assert.equal(t.isOverdue, true);
    assert.match(t.label, /^Target passed \d+ weeks ago$/);
  });

  it('derives elapsed progress from creation to target', () => {
    const t = getGoalTimeline(
      { targetDate: '2026-12-31', createdAt: '2026-01-01T00:00:00.000Z' },
      at(2026, 7, 2),
      1,
    );
    assert.ok(t.elapsed > 0.48 && t.elapsed < 0.52);
  });

  it('leaves the line empty when there is no creation date to measure from', () => {
    const t = getGoalTimeline({ targetDate: '2027-01-01' }, at(2026, 9, 20), 1);
    assert.equal(t.elapsed, 0);
  });

  it('singularises one week', () => {
    const t = getGoalTimeline({ targetDate: '2026-09-22' }, at(2026, 9, 16), 1);
    assert.equal(t.label, '1 week left');
  });
});
