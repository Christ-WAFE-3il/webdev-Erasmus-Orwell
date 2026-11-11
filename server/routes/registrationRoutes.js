import express from 'express';
import { 
  cancelRegistrationById,
  NotFoundError,
  ForbiddenError
} from '../services/eventService.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  next();
};

router.delete('/:id', authenticate, (req, res) => {
  const registrationId = parseInt(req.params.id);
  if (isNaN(registrationId)) {
    return res.status(422).json({ error: 'Invalid registration ID' });
  }

  try {
    cancelRegistrationById(req.session.userId, registrationId);
    return res.status(204).end();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ error: err.message });
    }
    throw err;
  }
});

export default router;
