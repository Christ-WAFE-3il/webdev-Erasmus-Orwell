import db from '../db.js';

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function getUpcomingEvents() {
  const now = new Date().toISOString();
  const events = db.prepare('SELECT id, title, date, places FROM events WHERE date >= ? ORDER BY date ASC').all(now);
  return events;
}

export function signUpForEvent(userId, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const eventDate = new Date(event.date);
  if (eventDate < new Date()) {
    throw new ConflictError('This event has already happened');
  }

  const regCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE event_id = ?').get(eventId).count;
  if (regCount >= event.places) {
    throw new ConflictError('This event is full');
  }

  const transaction = db.transaction(() => {
    try {
      db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)').run(userId, eventId);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError('Already registered');
      }
      throw err;
    }
  });

  transaction();
  return { success: true };
}

export function cancelRegistration(userId, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const reg = db.prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  if (!reg) {
    const anyReg = db.prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id != ?').get(eventId, userId);
    if (anyReg) {
      throw new ForbiddenError('Cannot cancel another member\'s registration');
    }
    throw new NotFoundError('Registration not found');
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM registrations WHERE user_id = ? AND event_id = ?').run(userId, eventId);
  });

  transaction();
  return { success: true };
}
