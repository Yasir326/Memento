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
    await db.execAsync(m.up);
    await db.runAsync(
      'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
      [m.version, new Date().toISOString()],
    );
  }

  return db;
}

/**
 * Testing helper — drops the connection so the next getDb() call opens a
 * fresh one. Not exported from the module barrel; test files import
 * directly.
 */
export function _resetForTests() {
  dbPromise = null;
}
