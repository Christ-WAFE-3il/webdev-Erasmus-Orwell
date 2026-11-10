import test from 'node:test';
import assert from 'node:assert';
import db from './db.js';
import { runMigrations } from './migrate.js';
import { signUpForEvent, cancelRegistration } from './services/eventService.js';

test('Migration 002 creates registrations table', () => {
  runMigrations();
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='registrations'"
  ).get();
  assert.ok(tableCheck, 'registrations table should exist');
  assert.strictEqual(tableCheck.name, 'registrations');
});

test('AC-13 & AC-15: signUpForEvent adds registration and prevents double sign-up', () => {
  runMigrations();
  db.prepare('DELETE FROM users WHERE email = ?').run('testmember@club.com');
  const user = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(
    'testmember@club.com',
    'hash',
    'Test Member'
  );
  const userId = user.lastInsertRowid;

  const event = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run(
    'Test Event 13',
    '2030-01-01T10:00:00Z',
    5
  );
  const eventId = event.lastInsertRowid;

  try {
    const res = signUpForEvent(userId, eventId);
    assert.ok(res.success, 'Sign up should succeed');

    const count = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE user_id = ? AND event_id = ?').get(userId, eventId).count;
    assert.strictEqual(count, 1, 'One row should appear in registrations');

    assert.throws(() => {
      signUpForEvent(userId, eventId);
    }, (err) => {
      return err.name === 'ConflictError';
    }, 'Signing up twice should throw ConflictError');
  } finally {
    db.prepare('DELETE FROM registrations WHERE event_id = ?').run(eventId);
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }
});

test('AC-14: signUpForEvent on full event throws ConflictError with message "This event is full"', () => {
  runMigrations();
  db.prepare('DELETE FROM users WHERE email IN (?, ?)').run('u1_14@club.com', 'u2_14@club.com');
  const user1 = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('u1_14@club.com', 'h', 'U1').lastInsertRowid;
  const user2 = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('u2_14@club.com', 'h', 'U2').lastInsertRowid;
  const event = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run('Small Event 14', '2030-01-01T10:00:00Z', 1).lastInsertRowid;

  try {
    signUpForEvent(user1, event);

    assert.throws(() => {
      signUpForEvent(user2, event);
    }, (err) => {
      return err.name === 'ConflictError' && err.message === 'This event is full';
    });
  } finally {
    db.prepare('DELETE FROM registrations WHERE event_id = ?').run(event);
    db.prepare('DELETE FROM events WHERE id = ?').run(event);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(user1, user2);
  }
});

test('AC-19 & AC-20 & AC-22: edge cases for signUpForEvent', () => {
  runMigrations();
  db.prepare('DELETE FROM users WHERE email = ?').run('u_edge@club.com');
  const user = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('u_edge@club.com', 'h', 'U').lastInsertRowid;
  const pastEvent = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run('Past Event 20', '2020-01-01T10:00:00Z', 10).lastInsertRowid;

  try {
    // Past event (AC-20)
    assert.throws(() => {
      signUpForEvent(user, pastEvent);
    }, (err) => {
      return err.name === 'ConflictError' && err.message === 'This event has already happened';
    });

    // Non-existent event (AC-19)
    assert.throws(() => {
      signUpForEvent(user, 99999);
    }, (err) => {
      return err.name === 'NotFoundError';
    });
  } finally {
    db.prepare('DELETE FROM events WHERE id = ?').run(pastEvent);
    db.prepare('DELETE FROM users WHERE id = ?').run(user);
  }
});

test('AC-17 & AC-18 & AC-21: cancelRegistration rules', () => {
  runMigrations();
  db.prepare('DELETE FROM users WHERE email IN (?, ?)').run('u1_17@club.com', 'u2_17@club.com');
  const user1 = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('u1_17@club.com', 'h', 'U1').lastInsertRowid;
  const user2 = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('u2_17@club.com', 'h', 'U2').lastInsertRowid;
  const event = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run('Event 17', '2030-01-01T10:00:00Z', 10).lastInsertRowid;

  try {
    // Cancel when no one ever registered (AC-21)
    assert.throws(() => {
      cancelRegistration(user2, event);
    }, (err) => {
      return err.name === 'NotFoundError';
    });

    signUpForEvent(user1, event);

    // Cancel another member's registration (AC-18)
    assert.throws(() => {
      cancelRegistration(user2, event);
    }, (err) => {
      return err.name === 'ForbiddenError';
    });

    // Cancel own registration successfully (AC-17)
    const res = cancelRegistration(user1, event);
    assert.ok(res.success, 'Cancel should succeed');
    const count = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE user_id = ? AND event_id = ?').get(user1, event).count;
    assert.strictEqual(count, 0, 'Registration row should be removed');
  } finally {
    db.prepare('DELETE FROM registrations WHERE event_id = ?').run(event);
    db.prepare('DELETE FROM events WHERE id = ?').run(event);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(user1, user2);
  }
});
