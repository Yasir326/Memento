// Single-source database connection + migration runner.
//
// The doc's Section 13 wants domain rules independent of platform APIs. This
// module is the ONLY place that imports expo-sqlite. Repositories consume
// `getDb()`; domain logic never touches SQLite directly.

import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

const DB_NAME = 'memento.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Lazy singleton — opens the database on first use, runs any pending
 * migrations, and returns a shared connection thereafter. Callers should
 * always await this rather than caching the resolved value themselves.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Bootstrap the versions table so we can idempotently apply migrations.
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );`,
  );

  const rows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations',
  );
  const applied = new Set(rows.map((r) => r.version));

  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    // One transaction per migration, covering the schema change AND the
    // version row. Without it a migration whose second statement fails
    // leaves the first applied and the version unrecorded, so the next
    // launch replays it and fails forever on the part that succeeded.
    await db.withTransactionAsync(async () => {
      await execTolerantly(db, m.up);
      await db.runAsync(
        'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
        [m.version, new Date().toISOString()],
      );
    });
  }

  return db;
}

/**
 * Runs a migration's statements, ignoring the one error that is safe to
 * ignore: a column that already exists.
 *
 * SQLite has no ADD COLUMN IF NOT EXISTS, and unlike CREATE TABLE IF NOT
 * EXISTS it throws rather than no-opping. A database that acquired the
 * column by another route (a dev build, a restored backup) would otherwise
 * be permanently unable to pass this migration.
 */
async function execTolerantly(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  // Strip line comments BEFORE splitting: migration 1 has a semicolon
  // inside a "-- ISO date YYYY-MM-DD; null until..." comment, and naive
  // splitting would cut a CREATE TABLE in half.
  const statements = sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await db.execAsync(statement);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/duplicate column name/i.test(message)) continue;
      throw e;
    }
  }
}

/**
 * Testing helper — drops the connection so the next getDb() call opens a
 * fresh one. Not exported from the module barrel; test files import
 * directly.
 */
export function _resetForTests() {
  dbPromise = null;
}
