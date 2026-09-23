// Goal ideas, keyed to the life areas offered on the Direction step.
//
// Doc §06: "Use selected life areas to suggest examples, but never force
// templates or AI generation." So these are examples a person taps to fill
// the field and then edits — not templates that carry structure, and not
// generated. The field stays freely editable and the suggestions can be
// ignored entirely.
//
// Writing rules for anything added here:
//   - Phrase as the user's own commitment, first person, plain verb.
//     "Run a half marathon", not "Fitness goal" or "Get healthy".
//   - Concrete enough to have an obvious finish line, since the next screen
//     asks for a target date and the grid counts weeks to it. A goal you
//     cannot tell you have finished makes the week count meaningless.
//   - No numbers the app cannot know are right for this person (no "lose
//     10kg", no "save £5,000") — those belong to the user, not to us.
//   - Nothing that reads as self-improvement pressure. Tone boundaries in
//     §02 apply to suggestions as much as to notifications.

/**
 * The life areas offered on the Direction step, in display order. Single
 * source of truth: the screen renders these and every one must have ideas
 * behind it, or selecting it buys the user nothing on the next screen.
 */
export const LIFE_AREAS = [
  'Family',
  'Health',
  'Faith',
  'Create',
  'Career',
  'Adventure',
  'Learning',
  'Community',
  'Financial freedom',
  'Other',
] as const;

export type LifeArea = (typeof LIFE_AREAS)[number];

export const GOAL_SUGGESTIONS: Record<string, readonly string[]> = {
  Family: [
    'Plan a trip with the people I love',
    'Call my parents every week',
    'Record my grandparents telling their story',
  ],
  Health: [
    'Run a half marathon',
    'Cook at home five nights a week',
    'Get back to full strength after my injury',
  ],
  Faith: [
    'Read the whole text end to end',
    'Keep a weekly practice I do not skip',
    'Join a community near me',
  ],
  Create: [
    'Finish the album',
    'Write the first draft',
    'Ship the thing I keep not shipping',
  ],
  Career: [
    'Move into the role I actually want',
    'Launch my first product',
    'Leave with a month of runway saved',
  ],
  Adventure: [
    'Walk the coast path',
    'Learn to dive',
    'Spend a month working from another country',
  ],
  Learning: [
    'Hold a conversation in a new language',
    'Finish the course I started',
    'Read the books already on my shelf',
  ],
  Community: [
    'Volunteer somewhere every month',
    'Host people at my table regularly',
    'Start the thing my neighbourhood is missing',
  ],
  'Financial freedom': [
    'Clear the debt',
    'Build a real emergency fund',
    'Make my first month of income outside my job',
  ],
  Other: [
    'Finish what I started last year',
    'Make the change I keep postponing',
  ],
};

/**
 * Suggestions for the user's selected areas, interleaved so no single area
 * dominates the top of a short list, and capped so the screen stays a goal
 * field with ideas under it rather than a menu.
 *
 * Returns [] when nothing is selected — the Direction step is skippable, and
 * a user who skipped it should see no suggestion section at all rather than
 * a generic one they did not ask for.
 */
export function suggestionsForAreas(areas: string[], limit = 4): string[] {
  const lists = areas
    .map((area) => GOAL_SUGGESTIONS[area])
    .filter((list): list is readonly string[] => Array.isArray(list) && list.length > 0);

  if (lists.length === 0) return [];

  const out: string[] = [];
  for (let round = 0; out.length < limit; round++) {
    let addedThisRound = false;
    for (const list of lists) {
      if (round >= list.length) continue;
      out.push(list[round]);
      addedThisRound = true;
      if (out.length >= limit) break;
    }
    if (!addedThisRound) break; // every list exhausted
  }
  return out;
}
