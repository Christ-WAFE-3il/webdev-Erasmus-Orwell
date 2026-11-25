import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  // Ensure base database tables exist (users, events)
  await initDb();

  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('No migrations directory found.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL
      );
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const res = await client.query('SELECT name FROM migration_history');
    const appliedMigrations = res.rows.map(row => row.name);

    for (const file of files) {
      if (!appliedMigrations.includes(file)) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO migration_history (name, applied_at) VALUES ($1, NOW())',
            [file]
          );
          await client.query('COMMIT');
          console.error(`Applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}

// If run directly via node server/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.error('Migrations completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
