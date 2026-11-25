import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert';
import pool from './db.js';
import { runMigrations } from './migrate.js';
import { signUpForEvent, cancelRegistration } from './services/eventService.js';
import { setupTestDb, closeTestDb } from './testHelper.js';

beforeEach(async () => {
  await setupTestDb();
});

after(async () => {
  await closeTestDb();
});

test('Migration 002 creates registrations table', async () => {
  await runMigrations();
  const tableCheckRes = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='registrations'"
  );
  assert.ok(tableCheckRes.rows.length > 0, 'registrations table should exist');
  assert.strictEqual(tableCheckRes.rows[0].tablename, 'registrations');
});

test('AC-7 & AC-13 & AC-15: signUpForEvent adds registration and prevents double sign-up', async () => {
  const userRes = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', [
    'testmember@club.com',
    'hash',
    'Test Member'
  ]);
  const userId = userRes.rows[0].id;

  const eventRes = await pool.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3) RETURNING id', [
    'Test Event 13',
    '2030-01-01T10:00:00Z',
    5
  ]);
  const eventId = eventRes.rows[0].id;

  const res = await signUpForEvent(userId, eventId);
  assert.ok(res.success, 'Sign up should succeed');

  const countRes = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
  const count = parseInt(countRes.rows[0].count);
  assert.strictEqual(count, 1, 'One row should appear in registrations');

  await assert.rejects(async () => {
    await signUpForEvent(userId, eventId);
  }, (err) => {
    return err.name === 'ConflictError';
  }, 'Signing up twice should throw ConflictError');
});

test('AC-6 & AC-14: signUpForEvent on full event throws ConflictError with message "This event is full"', async () => {
  const user1Res = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', ['u1_14@club.com', 'h', 'U1']);
  const user1 = user1Res.rows[0].id;
  const user2Res = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', ['u2_14@club.com', 'h', 'U2']);
  const user2 = user2Res.rows[0].id;
  const eventRes = await pool.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3) RETURNING id', ['Small Event 14', '2030-01-01T10:00:00Z', 1]);
  const event = eventRes.rows[0].id;

  await signUpForEvent(user1, event);

  await assert.rejects(async () => {
    await signUpForEvent(user2, event);
  }, (err) => {
    return err.name === 'ConflictError' && err.message === 'This event is full';
  });
});

test('AC-19 & AC-20 & AC-22: edge cases for signUpForEvent', async () => {
  const userRes = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', ['u_edge@club.com', 'h', 'U']);
  const user = userRes.rows[0].id;
  const eventRes = await pool.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3) RETURNING id', ['Past Event 20', '2020-01-01T10:00:00Z', 10]);
  const pastEvent = eventRes.rows[0].id;

  // Past event (AC-20)
  await assert.rejects(async () => {
    await signUpForEvent(user, pastEvent);
  }, (err) => {
    return err.name === 'ConflictError' && err.message === 'This event has already happened';
  });

  // Non-existent event (AC-19)
  await assert.rejects(async () => {
    await signUpForEvent(user, 99999);
  }, (err) => {
    return err.name === 'NotFoundError';
  });
});

test('AC-17 & AC-18 & AC-21: cancelRegistration rules', async () => {
  const user1Res = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', ['u1_17@club.com', 'h', 'U1']);
  const user1 = user1Res.rows[0].id;
  const user2Res = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id', ['u2_17@club.com', 'h', 'U2']);
  const user2 = user2Res.rows[0].id;
  const eventRes = await pool.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3) RETURNING id', ['Event 17', '2030-01-01T10:00:00Z', 10]);
  const event = eventRes.rows[0].id;

  // Cancel when no one ever registered (AC-21)
  await assert.rejects(async () => {
    await cancelRegistration(user2, event);
  }, (err) => {
    return err.name === 'NotFoundError';
  });

  await signUpForEvent(user1, event);

  // Cancel another member's registration (AC-18)
  await assert.rejects(async () => {
    await cancelRegistration(user2, event);
  }, (err) => {
    return err.name === 'ForbiddenError';
  });

  // Cancel own registration successfully (AC-17)
  const res = await cancelRegistration(user1, event);
  assert.ok(res.success, 'Cancel should succeed');
  const countRes = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE user_id = $1 AND event_id = $2', [user1, event]);
  const count = parseInt(countRes.rows[0].count);
  assert.strictEqual(count, 0, 'Registration row should be removed');
});
