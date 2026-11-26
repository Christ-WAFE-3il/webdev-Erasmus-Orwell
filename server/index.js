import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import { pingDb } from './data/dbUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const required = ['SESSION_SECRET', 'DATABASE_URL'];
if (process.env.NODE_ENV !== 'test') {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(', ')}. See .env.example`);
    process.exit(1);
  }
}

initDb().catch((err) => console.error('Database initialisation failed:', err.message));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'test-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Static frontend serving placeholder for step 3
app.use(express.static(path.join(__dirname, '../client')));

// Health check route
app.get('/health', async (req, res) => {
  try {
    await pingDb();
    return res.status(200).json({ status: 'ok', db: 'ok' });
  } catch (err) {
    return res.status(503).json({ status: 'error', db: 'down' });
  }
});

// Unknown path handler
app.use((req, res) => {
  return res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  const status = (err.status >= 400 && err.status <= 499) ? 400 : 500;
  const message = status === 400 ? 'Invalid request' : 'Internal server error';
  return res.status(status).json({ error: message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
