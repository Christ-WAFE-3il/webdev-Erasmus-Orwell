import db, { initDb } from './db.js';

initDb();

const users = db.prepare('SELECT * FROM users').all();
const events = db.prepare('SELECT * FROM events').all();

console.log('--- USERS ---');
console.log(users);
console.log('--- EVENTS ---');
console.log(events);
