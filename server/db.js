import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

if (isTest) {
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is required for tests');
  }
  if (connectionString === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must not be the same as DATABASE_URL');
  }
}

const pool = new Pool({
  connectionString
});

// Initialize tables and seed data
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        places INTEGER NOT NULL
      );
    `);

    // Check if test user exists, if not seed test user and events
    const userCountResult = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);
    if (userCount === 0) {
      const passwordHash = bcrypt.hashSync('password123', 10);
      await client.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING', [
        'student@club.com',
        passwordHash,
        'Alice Student'
      ]);
    }

    const eventCountResult = await client.query('SELECT COUNT(*) as count FROM events');
    const eventCount = parseInt(eventCountResult.rows[0].count);
    if (eventCount === 0) {
      await client.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3)', [
        'Python Workshop', '2027-03-15T18:00:00Z', 20
      ]);
      await client.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3)', [
        'Web Dev Hackathon', '2027-03-22T10:00:00Z', 15
      ]);
      await client.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3)', [
        'AI & Ethics Seminar', '2027-03-29T17:30:00Z', 30
      ]);
    }
  } finally {
    client.release();
  }
}

export default pool;
