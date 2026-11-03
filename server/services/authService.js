import db from '../db.js';
import bcrypt from 'bcrypt';

export function authenticateUser(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Wrong email or password' };
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return { success: false, message: 'Wrong email or password' };
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return { success: false, message: 'Wrong email or password' };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

export function getUserById(id) {
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id);
  return user || null;
}
