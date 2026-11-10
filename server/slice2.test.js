import test from 'node:test';
import assert from 'node:assert';
import db from './db.js';
import { runMigrations } from './migrate.js';

test('Migration 002 creates registrations table', () => {
  runMigrations();
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='registrations'"
  ).get();
  assert.ok(tableCheck, 'registrations table should exist');
  assert.strictEqual(tableCheck.name, 'registrations');
});
