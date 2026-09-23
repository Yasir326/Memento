// Onboarding flow tests — resume points and progress monotonicity.
//
// The failure modes these guard against are both silent and both bad: a user
// who resumes too early is asked to redo work, and a user whose progress
// rewinds loses answers that were never written to SQLite.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FIRST_ROUTE,
  STEP_ORDER,
  isLaterStep,
  resumeRoute,
  type OnboardingStep,
} from '../onboardingFlow';
import {
  suggestionsForAreas,
  GOAL_SUGGESTIONS,
  LIFE_AREAS,
} from '../../content/goalSuggestions';

describe('resume routing', () => {
  it('starts at the beginning when nothing is complete', () => {
    assert.equal(resumeRoute(null), FIRST_ROUTE);
  });

  it('resumes at the screen after the last completed one', () => {
    assert.equal(resumeRoute('intro'), '/(onboarding)/profile');
    assert.equal(resumeRoute('profile'), '/(onboarding)/reveal');
    assert.equal(resumeRoute('reveal'), '/(onboarding)/values');
    assert.equal(resumeRoute('values'), '/(onboarding)/first-goal');
    assert.equal(resumeRoute('first-goal'), '/(onboarding)/weekly-focus');
    assert.equal(resumeRoute('weekly-focus'), '/(onboarding)/finish');
  });

  it('gives every step a destination', () => {
    // A step with no mapping would resolve to undefined and navigate nowhere,
    // leaving the user on a blank route with no way forward.
    for (const step of STEP_ORDER) {
      const route = resumeRoute(step);
      assert.ok(route.startsWith('/(onboarding)/'), `${step} → ${route}`);
    }
  });

  it('falls back to the start for a step name from an older build', () => {
    assert.equal(resumeRoute('retired-step' as OnboardingStep), FIRST_ROUTE);
  });

  it('never resumes at a step the user has not reached', () => {
    // resumeRoute('values') must not skip first-goal, etc. Checked by
    // confirming each destination is the immediate successor.
    STEP_ORDER.forEach((step, i) => {
      const next = STEP_ORDER[i + 1];
      if (!next) return;
      assert.equal(resumeRoute(step), `/(onboarding)/${next}`);
    });
  });
});

describe('progress monotonicity', () => {
  it('advances on a later step', () => {
    assert.equal(isLaterStep('profile', 'intro'), true);
    assert.equal(isLaterStep('intro', null), true);
  });

  it('refuses to rewind when an earlier screen is re-confirmed', () => {
    // Back to the profile screen from first-goal, tap continue again: the
    // resume point must stay at first-goal or quitting now loses the goal.
    assert.equal(isLaterStep('profile', 'first-goal'), false);
    assert.equal(isLaterStep('intro', 'weekly-focus'), false);
  });

  it('treats re-completing the same step as no movement', () => {
    for (const step of STEP_ORDER) {
      assert.equal(isLaterStep(step, step), false);
    }
  });
});

describe('goal suggestions', () => {
  it('offers nothing when the user skipped life areas', () => {
    assert.deepEqual(suggestionsForAreas([]), []);
  });

  it('interleaves across areas so one does not dominate', () => {
    const picked = suggestionsForAreas(['Health', 'Career'], 4);
    assert.equal(picked.length, 4);
    // First two come from different areas.
    assert.ok(GOAL_SUGGESTIONS.Health.includes(picked[0]));
    assert.ok(GOAL_SUGGESTIONS.Career.includes(picked[1]));
  });

  it('respects the limit and never repeats', () => {
    const picked = suggestionsForAreas(['Family', 'Health', 'Career'], 3);
    assert.equal(picked.length, 3);
    assert.equal(new Set(picked).size, 3);
  });

  it('terminates when the areas hold fewer ideas than the limit', () => {
    // 'Other' has two entries; asking for ten must not loop forever.
    const picked = suggestionsForAreas(['Other'], 10);
    assert.equal(picked.length, GOAL_SUGGESTIONS.Other.length);
  });

  it('ignores an unknown area without throwing', () => {
    assert.deepEqual(suggestionsForAreas(['Nonsense']), []);
    assert.equal(suggestionsForAreas(['Nonsense', 'Health'], 2).length, 2);
  });

  it('covers every area the Direction step offers', () => {
    // LIFE_AREAS is what the values screen renders, so this cannot drift.
    // A chip with no ideas behind it means a user selects it and gets
    // nothing on the next screen.
    for (const area of LIFE_AREAS) {
      const ideas = GOAL_SUGGESTIONS[area];
      assert.ok(ideas && ideas.length > 0, `no goal ideas for "${area}"`);
    }
  });
});
