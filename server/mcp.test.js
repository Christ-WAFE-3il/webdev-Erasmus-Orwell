import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const testDbPath = path.join(process.cwd(), 'server', `mcp-test-${process.pid}.sqlite`);
process.env.DATABASE_PATH = testDbPath;

if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

test('MCP tool register_for_event on a full event returns isError true with message "This event is full"', async () => {
  const { default: db } = await import('./db.js');
  const { runMigrations } = await import('./migrate.js');

  // Create base tables as requested in the test file
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

  // Seed test user
  const passwordHash = bcrypt.hashSync('password123', 10);
  db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(
    'student@club.com',
    passwordHash,
    'Alice Student'
  );

  runMigrations();

  const eventId = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run(
    'MCP Full Event Test', '2030-01-01T10:00:00Z', 0
  ).lastInsertRowid;

  db.close();

  const child = spawn('node', ['mcp-server/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, DATABASE_PATH: testDbPath, MCP_USER_EMAIL: 'student@club.com' }
  });

  let stdoutData = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdoutData += chunk;
  });

  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'register_for_event', arguments: { eventId: Number(eventId) } } }
  ];

  for (const msg of messages) {
    child.stdin.write(JSON.stringify(msg) + '\n');
  }

  const startTime = Date.now();
  let reply = null;
  while (Date.now() - startTime < 3000) {
    const lines = stdoutData.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === 2) {
          reply = parsed;
          break;
        }
      } catch {}
    }
    if (reply) break;
    await new Promise(r => setTimeout(r, 50));
  }

  child.stdin.end();
  child.kill();

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  assert.ok(reply, 'MCP server should reply to register_for_event call');
  assert.strictEqual(reply.result?.isError, true, 'isError should be true');
  assert.ok(reply.result?.content?.[0]?.text?.includes('This event is full'), 'Message should be "This event is full"');
});
