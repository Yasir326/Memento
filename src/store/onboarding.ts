// Onboarding store — the in-flight answers as the user moves through setup.
//
// Persisted to AsyncStorage, which is what makes doc §06's recovery rule
// real: "App closed mid-setup → resume at the last completed step with prior
// answers restored." Birth date, horizon and life areas were already written
// to SQLite step by step, but the goal and the weekly action live only here
// until `finish` commits them together — so without persistence, closing the
// app on the weekly-focus screen threw away the goal the user had just
// written AND restarted them at the intro.
//
// `lastCompletedStep` is tracked explicitly rather than inferred from which
// fields are filled. Inference gets it wrong for skippable and optional
// answers: a user who skipped life areas looks identical to one who never
// reached that screen.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMonths, toISODate, todayPlain } from '@/domain/dates';
import { isLaterStep, type OnboardingStep } from '@/domain/onboardingFlow';

// Flow shape and resume rules live in the domain layer so they stay
// testable without a native host; re-exported here for existing callers.
export { resumeRoute, type OnboardingStep } from '@/domain/onboardingFlow';

export type OnboardingDraft = {
  // Time setup
  birthDate: string | null;      // ISO YYYY-MM-DD
  projectedAge: number;

  // Direction (optional life areas — user can skip)
  lifeAreas: string[];

  // First goal
  goalTitle: string;
  goalTimeframeMonths: number | 'custom';
  goalCustomDate: string | null; // ISO YYYY-MM-DD, used when timeframe === 'custom'
  goalReason: string;

  // This week's focus
  weeklyFocusText: string;

  /** Last screen the user finished; null means they have not started. */
  lastCompletedStep: OnboardingStep | null;
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
  lastCompletedStep: null,
};

type OnboardingStore = OnboardingDraft & {
  /** False until AsyncStorage has been read. Routing must wait for it. */
  hasHydrated: boolean;
  set: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  patch: (partial: Partial<OnboardingDraft>) => void;
  /** Record a finished step. Never moves backwards. */
  completeStep: (step: OnboardingStep) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DRAFT,
      hasHydrated: false,
      set: (key, value) => set({ [key]: value } as unknown as Partial<OnboardingStore>),
      patch: (partial) => set(partial as Partial<OnboardingStore>),
      completeStep: (step) => {
        // Going back and re-confirming an earlier screen must not rewind
        // the resume point and strand the user behind work they've done.
        if (!isLaterStep(step, get().lastCompletedStep)) return;
        set({ lastCompletedStep: step });
      },
      reset: () => set({ ...DEFAULT_DRAFT }),
    }),
    {
      name: 'memento.onboarding.draft.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the answers only. Functions do not survive JSON, and
      // `hasHydrated` describes this run rather than the saved draft.
      partialize: (state): OnboardingDraft => ({
        birthDate: state.birthDate,
        projectedAge: state.projectedAge,
        lifeAreas: state.lifeAreas,
        goalTitle: state.goalTitle,
        goalTimeframeMonths: state.goalTimeframeMonths,
        goalCustomDate: state.goalCustomDate,
        goalReason: state.goalReason,
        weeklyFocusText: state.weeklyFocusText,
        lastCompletedStep: state.lastCompletedStep,
      }),
      onRehydrateStorage: () => (_state, error) => {
        // Mark hydrated either way. A storage read that fails must not hang
        // the splash screen forever — a lost draft is recoverable, an app
        // that never boots is not.
        if (error) {
          console.warn('[onboarding] draft failed to rehydrate', error);
        }
        useOnboardingStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/**
 * Convenience selector for the computed goal target date. Handles both
 * fixed-timeframe (3/6/12 months) and custom-date cases uniformly so
 * downstream code doesn't branch.
 */
export function computeGoalTargetDate(draft: OnboardingDraft): string | null {
  if (draft.goalTimeframeMonths === 'custom') {
    return draft.goalCustomDate;
  }
  // addMonths clamps end-of-month overflow (31 Jan + 1 month lands on
  // 28/29 Feb, not 2/3 Mar) and todayPlain reads the user's local calendar
  // day rather than the UTC one.
  return toISODate(addMonths(todayPlain(), draft.goalTimeframeMonths));
}
