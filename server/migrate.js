import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  // Ensure base database tables exist (users, events)
  initDb();

  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_history (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedMigrations = db.prepare('SELECT name FROM migration_history').all().map(row => row.name);

  for (const file of files) {
    if (!appliedMigrations.includes(file)) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const runMigrationTransaction = db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO migration_history (name, applied_at) VALUES (?, datetime('now'))").run(file);
      });

      runMigrationTransaction();
      console.log(`Applied migration: ${file}`);
    }
  }
}

// If run directly via node server/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
  console.log('Migrations completed successfully.');
}
