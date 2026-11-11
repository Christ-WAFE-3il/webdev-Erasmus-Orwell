import express from 'express';
import { 
  getUpcomingEvents, 
  signUpForEvent, 
  NotFoundError,
  ConflictError
} from '../services/eventService.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  next();
};

router.get('/', authenticate, (req, res) => {
  const events = getUpcomingEvents(req.session.userId);
  return res.json({ events });
});

router.post('/:id/registrations', authenticate, (req, res) => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) {
    return res.status(422).json({ error: 'Invalid event ID' });
  }

  try {
    signUpForEvent(req.session.userId, eventId);
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
