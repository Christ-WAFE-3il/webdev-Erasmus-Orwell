import { query } from './dbUtils.js';

export async function getUpcomingEvents(userId, now) {
  const res = await query(`
    SELECT 
      e.id, e.title, e.date, e.places,
      (e.places - (SELECT COUNT(*) FROM registrations WHERE event_id = e.id))::int as free_places,
      (SELECT id FROM registrations WHERE event_id = e.id AND user_id = $1) as registration_id
    FROM events e
    WHERE e.date >= $2
    ORDER BY e.date ASC
  `, [userId, now]);
  return res.rows;
}

export async function getEventById(eventId) {
  const res = await query('SELECT * FROM events WHERE id = $1', [eventId]);
  return res.rows[0] || null;
}

export async function findEventByTitle(title, userId) {
  const res = await query(`
    SELECT 
      e.id, e.title, e.date, e.places,
      (e.places - (SELECT COUNT(*) FROM registrations WHERE event_id = e.id))::int as free_places,
      (SELECT id FROM registrations WHERE event_id = e.id AND user_id = $1) as registration_id
    FROM events e
    WHERE e.title = $2
  `, [userId, title]);
  return res.rows[0] || null;
}
