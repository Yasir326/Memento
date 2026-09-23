// Migration tests.
//
// These do not open SQLite — expo-sqlite needs a native host. They check the
// part that is pure text handling and easy to get wrong: splitting a
// migration into statements. Migration 1 contains a semicolon inside a `--`
// comment ("ISO date YYYY-MM-DD; null until onboarding step 2"), so a naive
// split on ';' cuts a CREATE TABLE in half and the whole first launch fails.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MIGRATIONS } from '../schema';

/**
 * Mirrors `execTolerantly`'s splitting in db.ts. Kept in step with it by the
 * assertions below, which encode what the real migrations must produce.
 */
function splitStatements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('migrations', () => {
  it('numbers versions uniquely and in order', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    assert.deepEqual(versions, [...versions].sort((a, b) => a - b));
    assert.equal(new Set(versions).size, versions.length);
  });

  it('splits migration 1 without cutting a statement in half', () => {
    const [first] = MIGRATIONS;
    const statements = splitStatements(first.up);

    // Every CREATE TABLE must still carry its closing paren; a bad split
    // leaves a fragment with an unbalanced one.
    for (const s of statements) {
      const opens = (s.match(/\(/g) ?? []).length;
      const closes = (s.match(/\)/g) ?? []).length;
      assert.equal(opens, closes, `unbalanced parens in: ${s.slice(0, 60)}…`);
    }

    const tables = statements
      .filter((s) => /^CREATE TABLE/i.test(s))
      .map((s) => /CREATE TABLE IF NOT EXISTS (\w+)/i.exec(s)?.[1]);
    assert.deepEqual(tables, ['user_settings', 'goals', 'weekly_focus']);
  });

  it('seeds exactly one settings row', () => {
    const statements = splitStatements(MIGRATIONS[0].up);
    const seeds = statements.filter((s) => /^INSERT OR IGNORE INTO user_settings/i.test(s));
    assert.equal(seeds.length, 1);
  });

  it('adds the onboarding flag columns one statement at a time', () => {
    const second = MIGRATIONS.find((m) => m.version === 2);
    assert.ok(second, 'migration 2 exists');
    const statements = splitStatements(second.up);
    // Separate statements matter: they are applied individually so a column
    // that already exists can be skipped without aborting the rest.
    assert.deepEqual(statements, [
      'ALTER TABLE user_settings ADD COLUMN paywall_seen_at TEXT',
      'ALTER TABLE user_settings ADD COLUMN home_intro_seen_at TEXT',
    ]);
  });

  it('never rewrites an already-applied migration', () => {
    // A guard against the tempting edit: changing migration 1 in place does
    // nothing for users who already ran it, and silently diverges their
    // schema from a fresh install's.
    const first = MIGRATIONS[0].up;
    assert.match(first, /CREATE TABLE IF NOT EXISTS user_settings/);
    assert.doesNotMatch(first, /paywall_seen_at|home_intro_seen_at/);
  });
});
