import { findUserByEmail as findUserByEmailData, getUserById as getUserByIdData } from '../data/userData.js';
import bcrypt from 'bcrypt';

export async function authenticateUser(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Wrong email or password' };
  }

  const user = await findUserByEmailData(email);
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

export async function getUserById(id) {
  return await getUserByIdData(id);
}

export async function findUserByEmail(email) {
  return await findUserByEmailData(email);
}
