import test from 'node:test';
import assert from 'node:assert';
import app from './index.js';
import db from './db.js';
import { runMigrations } from './migrate.js';
import { suggestDescription } from './services/descriptionService.js';

runMigrations();

test('suggestDescription falls back when client fails or times out', async () => {
  const failingClient = async () => {
    throw new Error('API failure');
  };

  const result = await suggestDescription('Workshop', 'python code', failingClient);
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.length > 0);
  assert.ok(result.length <= 300);
  assert.ok(result.includes('Workshop'));
});

test('suggestDescription falls back on timeout', async () => {
  const slowClient = async () => {
    await new Promise(r => setTimeout(r, 5000));
    return 'too late';
  };

  const result = await suggestDescription('Seminar', 'AI ethics', slowClient);
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.length > 0);
  assert.ok(result.length <= 300);
  assert.ok(result.includes('Seminar'));
});

test('suggestDescription returns good answer when provided', async () => {
  const goodClient = async () => 'Join our exciting workshop to learn Python fundamentals.';

  const result = await suggestDescription('Python Workshop', 'coding', goodClient);
  assert.strictEqual(result, 'Join our exciting workshop to learn Python fundamentals.');
});

test('suggestDescription falls back on nonsense answer (empty or too long)', async () => {
  const emptyClient = async () => '';
  const longClient = async () => 'a'.repeat(301);

  const res1 = await suggestDescription('Event 1', 'test', emptyClient);
  assert.ok(res1.includes('Event 1'));
  assert.ok(res1.length <= 300);

  const res2 = await suggestDescription('Event 2', 'test', longClient);
  assert.ok(res2.includes('Event 2'));
  assert.ok(res2.length <= 300);
});

// API tests for POST /api/events/suggest-description
test('POST /api/events/suggest-description returns 401 without session', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Event', keywords: 'test' })
    });
    assert.strictEqual(res.status, 401);
  } finally {
    server.close();
  }
});

test('POST /api/events/suggest-description returns 422 when title is missing, empty, too long, or keywords too long', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // Sign in first
    const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = signinRes.headers.get('set-cookie');
    const headers = { 'Content-Type': 'application/json', 'cookie': cookie };

    // Missing title
    let res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ keywords: 'test' })
    });
    assert.strictEqual(res.status, 422);

    // Empty title
    res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: '   ', keywords: 'test' })
    });
    assert.strictEqual(res.status, 422);

    // Title > 100 chars
    res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'a'.repeat(101), keywords: 'test' })
    });
    assert.strictEqual(res.status, 422);

    // Keywords > 200 chars
    res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Valid Title', keywords: 'a'.repeat(201) })
    });
    assert.strictEqual(res.status, 422);

  } finally {
    server.close();
  }
});

test('POST /api/events/suggest-description returns 200 with fallback text when GEMINI_API_KEY is not set', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = signinRes.headers.get('set-cookie');

    const res = await fetch(`${baseUrl}/api/events/suggest-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cookie': cookie },
      body: JSON.stringify({ title: 'AI Conference', keywords: 'future, tech' })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.text, 'string');
    assert.ok(data.text.includes('AI Conference'));
    assert.ok(data.text.length <= 300);
  } finally {
    if (oldKey !== undefined) {
      process.env.GEMINI_API_KEY = oldKey;
    }
    server.close();
  }
});
