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

export function getUpcomingEvents(userId) {
  const now = new Date().toISOString();
  const events = db.prepare(`
    SELECT 
      e.id, e.title, e.date, e.places,
      (e.places - (SELECT COUNT(*) FROM registrations WHERE event_id = e.id)) as free_places,
      (SELECT id FROM registrations WHERE event_id = e.id AND user_id = ?) as registration_id
    FROM events e
    WHERE e.date >= ?
    ORDER BY e.date ASC
  `).all(userId, now);
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

export function cancelRegistrationById(userId, registrationId) {
  const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registrationId);
  if (!reg) {
    throw new NotFoundError('Registration not found');
  }

  if (reg.user_id !== userId) {
    throw new ForbiddenError('Cannot cancel another member\'s registration');
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM registrations WHERE id = ?').run(registrationId);
  });

  transaction();
  return { success: true };
}
