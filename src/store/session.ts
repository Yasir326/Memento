// Session store — the runtime "who am I" state loaded from SQLite.
//
// Screens read `settings` from here rather than querying SQLite themselves,
// which keeps two screens from racing each other to refetch the same row.
//
// The rule that matters: ANY code path that writes to user_settings must
// call `refresh()` afterwards. The store is a cache of one SQLite row, and a
// write that skips the refresh leaves every screen reading a stale value
// until the next cold launch. That bug is not subtle in effect — onboarding
// wrote birthDate and onboardingCompletedAt straight to the database without
// refreshing, so the home screen saw a null birth date and rendered blank,
// and OnboardingGate saw a null completion date and bounced the user back to
// the first step. The app was unusable until it was force-quit and reopened.

import { create } from 'zustand';
import { getUserSettings, type UserSettings } from '@/repositories/userSettings';

type SessionState = {
  ready: boolean;
  settings: UserSettings | null;
  setSettings: (s: UserSettings | null) => void;
  /** Re-read user_settings from SQLite. Call after every write to that row. */
  refresh: () => Promise<UserSettings | null>;
  markReady: () => void;
};

export const useSession = create<SessionState>((set) => ({
  ready: false,
  settings: null,
  setSettings: (s) => set({ settings: s }),
  refresh: async () => {
    try {
      const s = await getUserSettings();
      set({ settings: s });
      return s;
    } catch {
      // Migrations may not have run yet on a very early call. Leaving the
      // previous value in place beats blanking the app out.
      return null;
    }
  },
  markReady: () => set({ ready: true }),
}));
