import db from '../db.js';

export function getUpcomingEvents() {
  const events = db.prepare('SELECT id, title, date, places FROM events ORDER BY date ASC').all();
  return events;
}
