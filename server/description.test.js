import test from 'node:test';
import assert from 'node:assert';
import { suggestDescription } from './services/descriptionService.js';

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
