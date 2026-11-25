import { query } from './dbUtils.js';

export async function findUserByEmail(email) {
  const res = await query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}

export async function getUserById(id) {
  const res = await query('SELECT id, email, name FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}
