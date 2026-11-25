import { 
  getUpcomingEvents as getUpcomingEventsData, 
  getEventById, 
  findEventByTitle as findEventByTitleData 
} from '../data/eventData.js';
import { 
  getRegistrationCountForEvent, 
  insertRegistration, 
  getRegistrationByEventAndUser, 
  getRegistrationByEventAndOtherUser, 
  deleteRegistration, 
  getRegistrationById, 
  deleteRegistrationById 
} from '../data/registrationData.js';
import { withTransaction } from '../data/dbUtils.js';

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function getUpcomingEvents(userId) {
  const now = new Date().toISOString();
  return await getUpcomingEventsData(userId, now);
}

export async function signUpForEvent(userId, eventId) {
  const event = await getEventById(eventId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const eventDate = new Date(event.date);
  if (eventDate < new Date()) {
    throw new ConflictError('This event has already happened');
  }

  const regCount = await getRegistrationCountForEvent(eventId);
  if (regCount >= event.places) {
    throw new ConflictError('This event is full');
  }

  await withTransaction(async (client) => {
    try {
      await insertRegistration(client, userId, eventId);
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictError('Already registered');
      }
      throw err;
    }
  });

  return { success: true };
}

export async function cancelRegistration(userId, eventId) {
  const event = await getEventById(eventId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const reg = await getRegistrationByEventAndUser(eventId, userId);
  if (!reg) {
    const anyReg = await getRegistrationByEventAndOtherUser(eventId, userId);
    if (anyReg) {
      throw new ForbiddenError('Cannot cancel another member\'s registration');
    }
    throw new NotFoundError('Registration not found');
  }

  await withTransaction(async (client) => {
    await deleteRegistration(client, userId, eventId);
  });

  return { success: true };
}

export async function cancelRegistrationById(userId, registrationId) {
  const reg = await getRegistrationById(registrationId);
  if (!reg) {
    throw new NotFoundError('Registration not found');
  }

  if (reg.user_id !== userId) {
    throw new ForbiddenError('Cannot cancel another member\'s registration');
  }

  await withTransaction(async (client) => {
    await deleteRegistrationById(client, registrationId);
  });

  return { success: true };
}

export async function findEventByTitle(title, userId) {
  return await findEventByTitleData(title, userId);
}
