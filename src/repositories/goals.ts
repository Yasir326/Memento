// Goals repository — up to three active at a time (enforced at write time
// per doc §08). Weekly focus lives in a separate repo because it's
// week-scoped, not goal-scoped.

import { getDb } from '@/database/db';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProgressMode = 'manual' | 'milestones';

export type Goal = {
  id: string;
  title: string;
  reason: string | null;
  targetDate: string;         // ISO YYYY-MM-DD
  progressMode: ProgressMode;
  progressValue: number;      // 0..1 for manual, count for milestones
  status: GoalStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  title: string;
  reason: string | null;
  target_date: string;
  progress_mode: string;
  progress_value: number;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToGoal(r: Row): Goal {
  return {
    id: r.id,
    title: r.title,
    reason: r.reason,
    targetDate: r.target_date,
    progressMode: (r.progress_mode as ProgressMode) ?? 'manual',
    progressValue: r.progress_value,
    status: (r.status as GoalStatus) ?? 'active',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM goals ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(rowToGoal);
}

export async function listActiveGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM goals WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC",
  );
  return rows.map(rowToGoal);
}

export type CreateGoalInput = {
  title: string;
  reason?: string | null;
  targetDate: string;
};

/**
 * Doc §08 rule: "Maximum of three active goals; additional goals require
 * archiving or completing one first." Enforced here so no UI path can
 * bypass the limit.
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const db = await getDb();
  const active = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM goals WHERE status = 'active'",
  );
  if ((active?.count ?? 0) >= MAX_ACTIVE_GOALS) {
    throw new Error('Maximum of three active goals');
  }

  const now = new Date().toISOString();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO goals
       (id, title, reason, target_date, progress_mode, progress_value,
        status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'manual', 0, 'active', ?, ?, ?)`,
    [id, input.title, input.reason ?? null, input.targetDate, (active?.count ?? 0), now, now],
  );

  const created = await db.getFirstAsync<Row>('SELECT * FROM goals WHERE id = ?', [id]);
  return rowToGoal(created!);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM goals WHERE id = ?', [id]);
  return row ? rowToGoal(row) : null;
}

export async function countActiveGoals(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM goals WHERE status = 'active'",
  );
  return row?.count ?? 0;
}

/** The doc's hard limit, exposed so UI can show "2 of 3 active" without guessing. */
export const MAX_ACTIVE_GOALS = 3;

/**
 * Move a goal between statuses. Completing or archiving frees a slot, which
 * is the only sanctioned way past the three-goal limit (doc §08). Reopening
 * an archived goal re-checks the limit so the cap can't be dodged.
 */
export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const db = await getDb();
  if (status === 'active') {
    const current = await getGoal(id);
    if (current && current.status !== 'active') {
      const active = await countActiveGoals();
      if (active >= MAX_ACTIVE_GOALS) {
        throw new Error('Maximum of three active goals');
      }
    }
  }
  await db.runAsync('UPDATE goals SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    new Date().toISOString(),
    id,
  ]);
}

/** Manual progress, 0..1. Clamped here so no caller can store a bad value. */
export async function setGoalProgress(id: string, value: number): Promise<void> {
  const db = await getDb();
  const clamped = Math.max(0, Math.min(1, value));
  await db.runAsync(
    'UPDATE goals SET progress_value = ?, updated_at = ? WHERE id = ?',
    [clamped, new Date().toISOString(), id],
  );
}

export type UpdateGoalInput = Partial<Pick<Goal, 'title' | 'reason' | 'targetDate'>>;

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<void> {
  const entries = Object.entries(input).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const columns: Record<string, string> = {
    title: 'title',
    reason: 'reason',
    targetDate: 'target_date',
  };
  const db = await getDb();
  const assignments = entries.map(([k]) => `${columns[k]} = ?`).join(', ');
  const values = entries.map(([, v]) => v as string | null);
  await db.runAsync(
    `UPDATE goals SET ${assignments}, updated_at = ? WHERE id = ?`,
    [...values, new Date().toISOString(), id],
  );
}

// Simple non-crypto ID — good enough for local rows. If we ever add sync,
// switch to a UUID-v7 for time-ordering.
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
