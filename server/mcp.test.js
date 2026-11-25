import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import pool from './db.js';
import { setupTestDb, closeTestDb } from './testHelper.js';

test('MCP tool register_for_event on a full event returns isError true with message "This event is full"', async () => {
  await setupTestDb();

  const eventRes = await pool.query('INSERT INTO events (title, date, places) VALUES ($1, $2, $3) RETURNING id', [
    'MCP Full Event Test', '2030-01-01T10:00:00Z', 0
  ]);
  const eventId = eventRes.rows[0].id;

  const child = spawn('node', ['mcp-server/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MCP_USER_EMAIL: 'student@club.com' }
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

  // Close the pool before the child is checked
  await closeTestDb();

  assert.ok(reply, 'MCP server should reply to register_for_event call');
  assert.strictEqual(reply.result?.isError, true, 'isError should be true');
  assert.ok(reply.result?.content?.[0]?.text?.includes('This event is full'), 'Message should be "This event is full"');
});
