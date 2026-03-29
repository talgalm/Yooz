import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, CLIENT_BUILD_PATH } from './config';
import { connectDB } from './db/connection';
import { migrateActivities, seedSuperAdmin, seedBuiltInMission } from './db/seed';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import activitiesRouter from './routes/activities';
import gamesRouter from './routes/games';
import stationsRouter from './routes/stations';
import managerRouter from './routes/manager';
import uploadRouter from './routes/upload';
import helpRouter from './routes/help';
import analyticsRouter from './routes/analytics';
import usersRouter from './routes/users';
import missionsRouter from './routes/missions';
import collageRouter from './routes/collage';
import libraryRouter from './routes/library';
import alertsRouter from './routes/alerts';

const app = express();

// CORS — restrict to known origins in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : undefined; // undefined = allow all (development)

app.use(
  cors({
    origin: allowedOrigins ?? true,
    credentials: true,
  }),
);
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/admin/games', gamesRouter);
app.use('/api/admin/stations', stationsRouter);
app.use('/api/manager', managerRouter);
app.use('/api/admin/upload', uploadRouter);
app.use('/api/help', helpRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/missions', missionsRouter);
app.use('/api/collage', collageRouter);
app.use('/api/admin/library', libraryRouter);
app.use('/api/alerts', alertsRouter);

// Serve static client build in production
app.use(express.static(CLIENT_BUILD_PATH));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
  }
});

// Global error handler for async route errors (prevents server crash)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled route error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch unhandled rejections to prevent server crash
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function start() {
  await connectDB();
  await migrateActivities();
  await seedSuperAdmin();
  await seedBuiltInMission();
  app.listen(PORT, () => {
    console.log(`🚀 Yooz server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
