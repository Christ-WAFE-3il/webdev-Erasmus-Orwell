import express from 'express';
import { getUpcomingEvents } from '../services/eventService.js';

const router = express.Router();

router.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  const events = getUpcomingEvents();
  return res.json({ events });
});

export default router;
