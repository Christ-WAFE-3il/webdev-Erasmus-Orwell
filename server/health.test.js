import test, { beforeEach, after, mock } from 'node:test';
import assert from 'node:assert';
import app from './index.js';
import pool from './db.js';
import { setupTestDb, closeTestDb } from './testHelper.js';

beforeEach(async () => {
  await setupTestDb();
});

after(async () => {
  await closeTestDb();
});

test('GET /health returns 200 when database is operational', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data, { status: 'ok', db: 'ok' });
  } finally {
    server.close();
  }
});

test('GET /health returns 503 when database query fails', async () => {
  const queryMock = mock.method(pool, 'query', async () => {
    throw new Error('DB down');
  });

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 503);
    const data = await res.json();
    assert.deepStrictEqual(data, { status: 'error', db: 'down' });
  } finally {
    server.close();
    queryMock.mock.restore();
  }
});

test('GET /unknown-path returns 404 for missing routes', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/nonexistent-route-12345`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    server.close();
  }
});

test('Malformed JSON request returns 400 via global error handler', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json'
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid request');
  } finally {
    server.close();
  }
});

test('Unhandled server error returns 500 via global error handler without stack trace', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
  });
  const cookie = signinRes.headers.get('set-cookie');

  const queryMock = mock.method(pool, 'query', async () => {
    throw new Error('Unexpected DB crash');
  });

  try {
    const res = await fetch(`${baseUrl}/api/events`, {
      headers: { cookie }
    });
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.error, 'Internal server error');
    const text = JSON.stringify(data);
    assert.ok(!text.includes('Error: Unexpected DB crash'));
    assert.ok(!text.includes('.js:'));
  } finally {
    server.close();
    queryMock.mock.restore();
  }
});
