import { query } from './dbUtils.js';

export async function getRegistrationCountForEvent(eventId) {
  const res = await query('SELECT COUNT(*)::int as count FROM registrations WHERE event_id = $1', [eventId]);
  return parseInt(res.rows[0].count);
}

export async function insertRegistration(client, userId, eventId) {
  await client.query('INSERT INTO registrations (user_id, event_id) VALUES ($1, $2)', [userId, eventId]);
}

export async function getRegistrationByEventAndUser(eventId, userId) {
  const res = await query('SELECT * FROM registrations WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
  return res.rows[0] || null;
}

export async function getRegistrationByEventAndOtherUser(eventId, userId) {
  const res = await query('SELECT * FROM registrations WHERE event_id = $1 AND user_id != $2', [eventId, userId]);
  return res.rows[0] || null;
}

export async function deleteRegistration(client, userId, eventId) {
  await client.query('DELETE FROM registrations WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
}

export async function getRegistrationById(registrationId) {
  const res = await query('SELECT * FROM registrations WHERE id = $1', [registrationId]);
  return res.rows[0] || null;
}

export async function deleteRegistrationById(client, registrationId) {
  await client.query('DELETE FROM registrations WHERE id = $1', [registrationId]);
}
