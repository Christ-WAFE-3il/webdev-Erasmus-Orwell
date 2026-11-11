import test from 'node:test';
import assert from 'node:assert';
import app from './index.js';
import db from './db.js';
import { runMigrations } from './migrate.js';

runMigrations();

test('AC-14: signing up for a full event returns 409 Conflict', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Create a full event
    const eventId = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run(
      'Full Event API Test', '2030-01-01T10:00:00Z', 0
    ).lastInsertRowid;

    // 2. Sign in to get session
    const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = signinRes.headers.get('set-cookie');

    // 3. Attempt to register for the full event
    const regRes = await fetch(`${baseUrl}/api/events/${eventId}/registrations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'cookie': cookie
      }
    });

    assert.strictEqual(regRes.status, 409);
    const data = await regRes.json();
    assert.strictEqual(data.error, 'This event is full');

  } finally {
    server.close();
  }
});

test('Step 3: GET /api/events returns free_places and registration_id', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Create an event and a user
    const eventId = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run(
      'Event with Registrations', '2030-01-01T10:00:00Z', 10
    ).lastInsertRowid;
    
    // Alice Student (id=1) signs in
    const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = signinRes.headers.get('set-cookie');
    const aliceId = (await signinRes.json()).user.id;

    // 2. Alice registers for the event
    await fetch(`${baseUrl}/api/events/${eventId}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cookie': cookie }
    });

    // 3. Get events list
    const eventsRes = await fetch(`${baseUrl}/api/events`, {
      headers: { 'cookie': cookie }
    });
    const { events } = await eventsRes.json();
    const myEvent = events.find(e => e.id === eventId);

    assert.ok(myEvent, 'Event should be in the list');
    assert.strictEqual(myEvent.places, 10);
    assert.strictEqual(myEvent.free_places, 9);
    assert.ok(myEvent.registration_id !== null, 'registration_id should not be null');

  } finally {
    server.close();
  }
});

test('Step 3: DELETE /api/registrations/:id cancels sign-up', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    const eventId = db.prepare('INSERT INTO events (title, date, places) VALUES (?, ?, ?)').run(
      'Cancel Event Test', '2030-01-01T10:00:00Z', 10
    ).lastInsertRowid;

    const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = signinRes.headers.get('set-cookie');

    // Sign up
    await fetch(`${baseUrl}/api/events/${eventId}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cookie': cookie }
    });

    // Get registration_id
    const eventsRes = await fetch(`${baseUrl}/api/events`, {
      headers: { 'cookie': cookie }
    });
    const { events } = await eventsRes.json();
    const regId = events.find(e => e.id === eventId).registration_id;

    // Cancel sign up
    const cancelRes = await fetch(`${baseUrl}/api/registrations/${regId}`, {
      method: 'DELETE',
      headers: { 'cookie': cookie }
    });

    assert.strictEqual(cancelRes.status, 204);

    // Verify it's gone
    const eventsResAfter = await fetch(`${baseUrl}/api/events`, {
      headers: { 'cookie': cookie }
    });
    const { events: eventsAfter } = await eventsResAfter.json();
    const myEventAfter = eventsAfter.find(e => e.id === eventId);
    assert.strictEqual(myEventAfter.registration_id, null);
    assert.strictEqual(myEventAfter.free_places, 10);

  } finally {
    server.close();
  }
});
