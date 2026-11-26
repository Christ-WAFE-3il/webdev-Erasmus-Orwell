import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { authenticateUser, getUserById, findUserByEmail } from './services/authService.js';
import { getUpcomingEvents, findEventByTitle, cancelRegistration } from './services/eventService.js';
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

test('AC-11: user enters missing email or password and receives wrong email or password error', async () => {
  const res1 = await authenticateUser('', 'password123');
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.message, 'Wrong email or password');

  const res2 = await authenticateUser('student@club.com', '');
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.message, 'Wrong email or password');
});

test('AC-11: user enters non-existent email and receives wrong email or password error', async () => {
  const result = await authenticateUser('nonexistent@club.com', 'password123');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, 'Wrong email or password');
});

test('AC-10: getUserById and findUserByEmail retrieve user correctly', async () => {
  const user = await findUserByEmail('student@club.com');
  assert.ok(user);
  assert.strictEqual(user.email, 'student@club.com');

  const fetched = await getUserById(user.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.id, user.id);
});

test('AC-9 & AC-3: upcoming events can be retrieved ordered by date', async () => {
  const events = await getUpcomingEvents(null);
  assert.ok(events.length > 0);
  assert.strictEqual(events[0].title, 'Python Workshop BROKEN');
});

test('AC-3: findEventByTitle retrieves event by title', async () => {
  const event = await findEventByTitle('Python Workshop BROKEN', null);
  assert.ok(event);
  assert.strictEqual(event.title, 'Python Workshop BROKEN');
});

test('AC-19: cancelRegistration for non-existent event throws NotFoundError', async () => {
  await assert.rejects(async () => {
    await cancelRegistration(1, 99999);
  }, (err) => {
    return err.name === 'NotFoundError' && err.message === 'Event not found';
  });
});
