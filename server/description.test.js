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
