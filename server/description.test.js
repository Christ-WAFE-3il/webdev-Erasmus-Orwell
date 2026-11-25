import test, { beforeEach, after, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import app from './index.js';
import { suggestDescription } from './services/descriptionService.js';
import { setupTestDb, closeTestDb } from './testHelper.js';

beforeEach(async () => {
  await setupTestDb();
});

const originalFetch = global.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalModelName = process.env.MODEL_NAME;

afterEach(() => {
  global.fetch = originalFetch;
  mock.reset();
  if (originalApiKey !== undefined) {
    process.env.GEMINI_API_KEY = originalApiKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
  if (originalModelName !== undefined) {
    process.env.MODEL_NAME = originalModelName;
  } else {
    delete process.env.MODEL_NAME;
  }
});

after(async () => {
  await closeTestDb();
});

async function getFallback(title, keywords) {
  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    return await suggestDescription(title, keywords);
  } finally {
    if (oldKey !== undefined) {
      process.env.GEMINI_API_KEY = oldKey;
    }
  }
}

test('suggestDescription returns good answer via defaultClient', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Good answer from defaultClient' }] } }]
    })
  }));

  const result = await suggestDescription('Tech Talk', 'javascript');
  assert.strictEqual(result, 'Good answer from defaultClient');
});

test('suggestDescription uses MODEL_NAME env var', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.MODEL_NAME = 'custom-gemini-model';
  let requestedUrl = '';
  mock.method(global, 'fetch', async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Custom model answer' }] } }]
      })
    };
  });

  const result = await suggestDescription('Model Test', 'kw');
  assert.strictEqual(result, 'Custom model answer');
  assert.ok(requestedUrl.includes('custom-gemini-model'));
});

test('suggestDescription falls back on API error including rate limit via defaultClient', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  mock.method(global, 'fetch', async () => ({
    ok: false,
    status: 429
  }));

  const result1 = await suggestDescription('Tech Talk', 'javascript');
  const expected = await getFallback('Tech Talk', 'javascript');
  assert.strictEqual(result1, expected);

  mock.method(global, 'fetch', async () => ({
    ok: false,
    status: 500
  }));

  const result2 = await suggestDescription('Tech Talk', 'javascript');
  assert.strictEqual(result2, expected);
});

test('suggestDescription falls back on network failure via defaultClient', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  mock.method(global, 'fetch', async () => {
    throw new Error('Connection refused');
  });

  const result = await suggestDescription('Tech Talk', 'javascript');
  const expected = await getFallback('Tech Talk', 'javascript');
  assert.strictEqual(result, expected);
});

test('suggestDescription falls back when defaultClient returns non-string or too long output', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 12345 }] } }]
    })
  }));

  const res1 = await suggestDescription('Test Event', 'kw');
  const exp1 = await getFallback('Test Event', 'kw');
  assert.strictEqual(res1, exp1);

  mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'a'.repeat(301) }] } }]
    })
  }));

  const res2 = await suggestDescription('Test Event 2', 'kw');
  const exp2 = await getFallback('Test Event 2', 'kw');
  assert.strictEqual(res2, exp2);
});

test('suggestDescription falls back when missing key via defaultClient', async () => {
  delete process.env.GEMINI_API_KEY;

  const result = await suggestDescription('Tech Talk', 'javascript');
  const expected = await getFallback('Tech Talk', 'javascript');
  assert.strictEqual(result, expected);
});

test('suggestDescription handles non-string title and keywords', async () => {
  const result = await suggestDescription('Event Title', 456);
  const expected = await getFallback('Event Title', '');
  assert.strictEqual(result, expected);

  await assert.rejects(async () => {
    await suggestDescription(123, 'javascript');
  }, (err) => {
    assert.strictEqual(err.status, 422);
    return true;
  });
});

test('suggestDescription falls back when client fails or times out', async () => {
  const failingClient = async () => {
    throw new Error('API failure');
  };

  const result = await suggestDescription('Workshop', 'python code', failingClient);
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.length > 0);
  assert.ok(result.length <= 300);
  const expected = await getFallback('Workshop', 'python code');
  assert.strictEqual(result, expected);
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
  const expected = await getFallback('Seminar', 'AI ethics');
  assert.strictEqual(result, expected);
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
  const exp1 = await getFallback('Event 1', 'test');
  assert.strictEqual(res1, exp1);
  assert.ok(res1.length <= 300);

  const res2 = await suggestDescription('Event 2', 'test', longClient);
  const exp2 = await getFallback('Event 2', 'test');
  assert.strictEqual(res2, exp2);
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
    const expected = await getFallback('AI Conference', 'future, tech');
    assert.strictEqual(data.text, expected);
    assert.ok(data.text.length <= 300);
  } finally {
    server.close();
  }
});
