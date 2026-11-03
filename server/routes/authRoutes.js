import express from 'express';
import { authenticateUser, getUserById } from '../services/authService.js';

const router = express.Router();

router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  const result = authenticateUser(email, password);

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  req.session.userId = result.user.id;
  return res.json({ user: result.user });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const user = getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  return res.json({ user });
});

router.post('/signout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
