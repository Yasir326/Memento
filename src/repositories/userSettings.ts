// UserSettings repository — the "who am I" record.
//
// There is exactly one row keyed by 'me'. Callers either read the whole
// object or update named fields. Never expose SQL to consumers.

import { getDb } from '@/database/db';

export type UserSettings = {
  id: 'me';
  birthDate: string | null;         // ISO YYYY-MM-DD
  projectedAge: number;
  weekStartsOn: 0 | 1;
  theme: 'dark' | 'light';
  reminderMode: 'gentle' | 'focused' | 'relentless';
  lifeAreas: string[] | null;       // parsed from JSON in the DB
  isPro: boolean;
  onboardingCompletedAt: string | null;  // ISO datetime
};

type Row = {
  id: string;
  birth_date: string | null;
  projected_age: number;
  week_starts_on: number;
  theme: string;
  reminder_mode: string;
  life_areas: string | null;
  is_pro: number;
  onboarding_completed_at: string | null;
};

function rowToSettings(r: Row): UserSettings {
  return {
    id: 'me',
    birthDate: r.birth_date,
    projectedAge: r.projected_age,
    weekStartsOn: (r.week_starts_on === 0 ? 0 : 1) as 0 | 1,
    theme: r.theme === 'light' ? 'light' : 'dark',
    reminderMode: (r.reminder_mode as UserSettings['reminderMode']) ?? 'gentle',
    lifeAreas: r.life_areas ? JSON.parse(r.life_areas) : null,
    isPro: r.is_pro === 1,
    onboardingCompletedAt: r.onboarding_completed_at,
  };
}

export async function getUserSettings(): Promise<UserSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM user_settings WHERE id = ?',
    ['me'],
  );
  if (!row) {
    // schema.ts seeds the row; getting here means migrations didn't run.
    throw new Error('UserSettings row missing — did migrations run?');
  }
  return rowToSettings(row);
}

export type PartialUpdate = Partial<{
  birthDate: string | null;
  projectedAge: number;
  weekStartsOn: 0 | 1;
  theme: 'dark' | 'light';
  reminderMode: 'gentle' | 'focused' | 'relentless';
  lifeAreas: string[] | null;
  isPro: boolean;
  onboardingCompletedAt: string | null;
}>;

const FIELD_MAP: Record<keyof PartialUpdate, string> = {
  birthDate: 'birth_date',
  projectedAge: 'projected_age',
  weekStartsOn: 'week_starts_on',
  theme: 'theme',
  reminderMode: 'reminder_mode',
  lifeAreas: 'life_areas',
  isPro: 'is_pro',
  onboardingCompletedAt: 'onboarding_completed_at',
};

/**
 * Update named fields. Serialises life areas to JSON, booleans to 0/1.
 * Silent no-op if `updates` is empty rather than throwing — makes it safe
 * to call at the end of a step handler even when nothing changed.
 */
export async function updateUserSettings(updates: PartialUpdate): Promise<void> {
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const db = await getDb();
  const assignments = entries.map(([k]) => `${FIELD_MAP[k as keyof PartialUpdate]} = ?`).join(', ');
  const values = entries.map(([k, v]) => {
    if (k === 'lifeAreas') return v == null ? null : JSON.stringify(v);
    if (k === 'isPro') return v ? 1 : 0;
    return v as string | number | null;
  });

  await db.runAsync(
    `UPDATE user_settings SET ${assignments} WHERE id = 'me'`,
    values,
  );
}
