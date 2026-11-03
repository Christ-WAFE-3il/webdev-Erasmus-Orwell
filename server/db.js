import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize tables and seed data
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      places INTEGER NOT NULL
    );
  `);

  // Check if test user exists, if not seed test user and events
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync('password123', 10);
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(
      'student@club.com',
      passwordHash,
      'Alice Student'
    );
  }

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
  if (eventCount === 0) {
    const insertEvent = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)');
    insertEvent.run('Python Workshop', '2026-11-15T18:00:00Z', 20);
    insertEvent.run('Web Dev Hackathon', '2026-11-22T10:00:00Z', 15);
    insertEvent.run('AI & Ethics Seminar', '2026-11-29T17:30:00Z', 30);
  }
}

export default db;
