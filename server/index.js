import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import { getUpcomingEvents } from './services/eventService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'club-events-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }
  })
);

// API Routes
app.use('/api/auth', authRoutes);

app.get('/api/events', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  const events = getUpcomingEvents();
  return res.json({ events });
});

// Static frontend serving placeholder for step 3
app.use(express.static(path.join(__dirname, '../client')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
