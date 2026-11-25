import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { authenticateUser } from './services/authService.js';
import { getUpcomingEvents } from './services/eventService.js';
import { setupTestDb, closeTestDb } from './testHelper.js';

beforeEach(async () => {
  await setupTestDb();
});

after(async () => {
  await closeTestDb();
});

test('AC-10: user enters valid email and password and authenticates successfully', async () => {
  const result = await authenticateUser('student@club.com', 'password123');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.user.name, 'Alice Student');
});

test('AC-11: user enters wrong password and receives wrong email or password error', async () => {
  const result = await authenticateUser('student@club.com', 'wrongpassword');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, 'Wrong email or password');
});

test('AC-9 & AC-3: upcoming events can be retrieved ordered by date', async () => {
  const events = await getUpcomingEvents(null);
  assert.ok(events.length > 0);
  assert.strictEqual(events[0].title, 'Python Workshop');
});
