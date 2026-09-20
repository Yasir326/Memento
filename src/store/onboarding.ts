// Onboarding store — holds in-flight answers as the user moves through
// the 8-step flow. Values commit to SQLite at the end of each step so
// the doc's "resume mid-flow after crash" rule (§06) holds; the store
// itself is scratch memory.

import { create } from 'zustand';

export type OnboardingDraft = {
  // Step 2: Time setup
  birthDate: string | null;      // ISO YYYY-MM-DD
  projectedAge: number;

  // Step 4: Direction (optional life areas — user can skip)
  lifeAreas: string[];

  // Step 5: First goal
  goalTitle: string;
  goalTimeframeMonths: number | 'custom';
  goalCustomDate: string | null; // ISO YYYY-MM-DD, used when timeframe === 'custom'
  goalReason: string;

  // Step 6: This week's focus
  weeklyFocusText: string;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  birthDate: null,
  projectedAge: 85,
  lifeAreas: [],
  goalTitle: '',
  goalTimeframeMonths: 6,
  goalCustomDate: null,
  goalReason: '',
  weeklyFocusText: '',
};

type OnboardingStore = OnboardingDraft & {
  set: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  patch: (partial: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...DEFAULT_DRAFT,
  set: (key, value) => set({ [key]: value } as unknown as Partial<OnboardingStore>),
  patch: (partial) => set(partial as Partial<OnboardingStore>),
  reset: () => set({ ...DEFAULT_DRAFT }),
}));

/**
 * Convenience selector for the computed goal target date. Handles both
 * fixed-timeframe (3/6/12 months) and custom-date cases uniformly so
 * downstream code doesn't branch.
 */
export function computeGoalTargetDate(draft: OnboardingDraft): string | null {
  if (draft.goalTimeframeMonths === 'custom') {
    return draft.goalCustomDate;
  }
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + draft.goalTimeframeMonths,
      now.getUTCDate(),
    ),
  );
  return target.toISOString().slice(0, 10);
}
