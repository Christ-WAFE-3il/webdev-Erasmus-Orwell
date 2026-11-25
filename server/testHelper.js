import pool from './db.js';
import { runMigrations } from './migrate.js';

export async function setupTestDb() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test helper can only be run when NODE_ENV is "test"');
  }

  const client = await pool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE registrations, events, users, migration_history RESTART IDENTITY CASCADE;
    `);
  } catch (err) {
    // Tables might not exist yet on first run
  } finally {
    client.release();
  }

  await runMigrations();
}

export async function closeTestDb() {
  await pool.end();
}
