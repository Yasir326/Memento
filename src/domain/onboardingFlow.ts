// The shape of the setup flow: which screens exist, in what order, and where
// an interrupted run picks back up.
//
// Lives in `domain` rather than in the store because the store imports
// AsyncStorage, which needs a native host. Keeping the ordering rules here
// means they are plain functions that can be tested in Node — and this is
// exactly the logic worth testing, since getting it wrong either strands a
// user behind work they have already done or silently drops it.

export type OnboardingStep =
  | 'intro'
  | 'profile'
  | 'reveal'
  | 'values'
  | 'first-goal'
  | 'weekly-focus';

/** Completion order. The index in this list is the only ranking that matters. */
export const STEP_ORDER: readonly OnboardingStep[] = [
  'intro',
  'profile',
  'reveal',
  'values',
  'first-goal',
  'weekly-focus',
] as const;

/** The route that follows each completed step. */
const NEXT_ROUTE: Record<OnboardingStep, string> = {
  intro: '/(onboarding)/profile',
  profile: '/(onboarding)/reveal',
  reveal: '/(onboarding)/values',
  values: '/(onboarding)/first-goal',
  'first-goal': '/(onboarding)/weekly-focus',
  'weekly-focus': '/(onboarding)/finish',
};

export const FIRST_ROUTE = '/(onboarding)/intro';

/**
 * Where an interrupted setup resumes: the screen after the last one the user
 * finished, or the very beginning if they had not finished any.
 */
export function resumeRoute(lastCompletedStep: OnboardingStep | null): string {
  if (!lastCompletedStep) return FIRST_ROUTE;
  // A step name from an older build that no longer exists resolves to the
  // start rather than to `undefined`, which would navigate nowhere.
  return NEXT_ROUTE[lastCompletedStep] ?? FIRST_ROUTE;
}

/**
 * Whether `step` is further along than `lastCompletedStep`.
 *
 * Used to keep progress monotonic: users can go back and re-confirm an
 * earlier screen, and that must not rewind the resume point — otherwise
 * quitting after a backwards edit drops every answer made after it.
 */
export function isLaterStep(
  step: OnboardingStep,
  lastCompletedStep: OnboardingStep | null,
): boolean {
  const current = lastCompletedStep ? STEP_ORDER.indexOf(lastCompletedStep) : -1;
  return STEP_ORDER.indexOf(step) > current;
}
