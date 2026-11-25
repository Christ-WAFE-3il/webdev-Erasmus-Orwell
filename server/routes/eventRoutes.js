import express from 'express';
import { 
  getUpcomingEvents, 
  signUpForEvent, 
  NotFoundError,
  ConflictError
} from '../services/eventService.js';
import { suggestDescription } from '../services/descriptionService.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  next();
};

router.get('/', authenticate, async (req, res) => {
  const events = await getUpcomingEvents(req.session.userId);
  return res.json({ events });
});

router.post('/suggest-description', authenticate, async (req, res) => {
  const { title, keywords } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim() || title.length > 100) {
    return res.status(422).json({ error: 'Invalid title' });
  }
  if (keywords !== undefined && keywords !== null && (typeof keywords !== 'string' || keywords.length > 200)) {
    return res.status(422).json({ error: 'Invalid keywords' });
  }

  try {
    const text = await suggestDescription(title, keywords);
    return res.status(200).json({ text });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/registrations', authenticate, async (req, res) => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) {
    return res.status(422).json({ error: 'Invalid event ID' });
  }

  try {
    await signUpForEvent(req.session.userId, eventId);
    return res.status(201).json({ message: 'Signed up successfully' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});

export default router;
