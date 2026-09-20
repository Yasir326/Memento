// WeeklyFocus repository — one focus text per week, optionally linked to a goal.

import { getDb } from '@/database/db';

export type WeeklyFocus = {
  id: string;
  weekStartDate: string;    // ISO YYYY-MM-DD
  goalId: string | null;
  text: string;
  createdAt: string;
  completedAt: string | null;
};

type Row = {
  id: string;
  week_start_date: string;
  goal_id: string | null;
  text: string;
  created_at: string;
  completed_at: string | null;
};

function rowToFocus(r: Row): WeeklyFocus {
  return {
    id: r.id,
    weekStartDate: r.week_start_date,
    goalId: r.goal_id,
    text: r.text,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

export async function getFocusForWeek(weekStartDate: string): Promise<WeeklyFocus | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM weekly_focus WHERE week_start_date = ? ORDER BY created_at DESC LIMIT 1',
    [weekStartDate],
  );
  return row ? rowToFocus(row) : null;
}

export type CreateFocusInput = {
  weekStartDate: string;
  goalId?: string | null;
  text: string;
};

export async function createFocus(input: CreateFocusInput): Promise<WeeklyFocus> {
  const db = await getDb();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO weekly_focus (id, week_start_date, goal_id, text, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.weekStartDate, input.goalId ?? null, input.text, now],
  );
  const row = await db.getFirstAsync<Row>('SELECT * FROM weekly_focus WHERE id = ?', [id]);
  return rowToFocus(row!);
}
