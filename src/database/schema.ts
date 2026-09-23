// SQLite schema for Memento — v1 tables from the design doc §14.
//
// Migration philosophy: idempotent, numbered, committed-with-the-app.
// New tables or columns always ship in a new numbered migration, never as
// an edit to an existing one. That way a user upgrading from v0.1 to v0.2
// runs migration 2 only, not the full rebuild.

export type Migration = {
  version: number;
  up: string;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY DEFAULT 'me',
        birth_date TEXT,                  -- ISO date YYYY-MM-DD; null until onboarding step 2
        projected_age INTEGER NOT NULL DEFAULT 85,
        week_starts_on INTEGER NOT NULL DEFAULT 1,  -- 0=Sun, 1=Mon
        theme TEXT NOT NULL DEFAULT 'dark',
        reminder_mode TEXT NOT NULL DEFAULT 'gentle',
        life_areas TEXT,                  -- JSON array; null if user skipped
        is_pro INTEGER NOT NULL DEFAULT 0,  -- stubbed until RevenueCat is wired
        onboarding_completed_at TEXT      -- ISO datetime, null while in-flight
      );

      -- Single-row table pattern: seed the "me" row on first migration so
      -- callers never need to check "does the row exist?" — they upsert.
      INSERT OR IGNORE INTO user_settings (id) VALUES ('me');

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        reason TEXT,                      -- optional "why it matters"
        target_date TEXT NOT NULL,        -- ISO date
        progress_mode TEXT NOT NULL DEFAULT 'manual',  -- manual | milestones
        progress_value REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',  -- active | paused | completed | archived
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS weekly_focus (
        id TEXT PRIMARY KEY,
        week_start_date TEXT NOT NULL,    -- ISO date of the week's Monday
        goal_id TEXT,                     -- nullable — user can pick a focus without linking a goal
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_weekly_focus_week ON weekly_focus(week_start_date);
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    `,
  },
  {
    // Onboarding now ends on the home screen, with the upgrade offer shown
    // over it once (doc §06 steps 7-8). Both moments need a "already shown" marker
    // so they never repeat: a paywall that returns on every launch is exactly
    // what §07's trust rules rule out.
    version: 2,
    up: `
      ALTER TABLE user_settings ADD COLUMN paywall_seen_at TEXT;
      ALTER TABLE user_settings ADD COLUMN home_intro_seen_at TEXT;
    `,
  },
];
