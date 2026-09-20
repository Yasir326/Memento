// Session store — the runtime "who am I" state loaded from SQLite on
// launch. Screens read from this store; only the loader in _layout writes
// it. Keeping the loader in one place avoids race conditions where two
// screens both refetch from SQLite.

import { create } from 'zustand';
import type { UserSettings } from '@/repositories/userSettings';

type SessionState = {
  ready: boolean;
  settings: UserSettings | null;
  setSettings: (s: UserSettings | null) => void;
  markReady: () => void;
};

export const useSession = create<SessionState>((set) => ({
  ready: false,
  settings: null,
  setSettings: (s) => set({ settings: s }),
  markReady: () => set({ ready: true }),
}));
