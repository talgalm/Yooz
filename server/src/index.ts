import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  PORT,
  CLIENT_BUILD_PATH,
  TEXTME_API_TOKEN,
  TEXTME_USERNAME,
  TEXTME_SOURCE,
} from './config';
import { connectDB } from './db/connection';
import { Activity } from './models';
import {
  buildPlayOgHtml,
  isSocialCrawler,
  requestOrigin,
} from './utils/shareOgPage';
import { migrateActivities, migrateActivityGroups, seedSuperAdmin, seedBuiltInMission, seedManageUsers, seedInternalProject, dropManageProjectCodeIndex } from './db/seed';
import { processExpiredRewardTimers } from './services/groupRewardService';
import { CollageJob } from './models/CollageJob';
import { scheduleCollageEncode } from './services/collageProcessor';
import { setSmsProvider } from './services/sms/smsProvider';
import { TextmeSmsProvider } from './services/sms/textmeSmsProvider';
import rewardDownloadRouter from './routes/rewardDownload';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import activitiesRouter from './routes/activities';
import gamesRouter from './routes/games';
import stationsRouter from './routes/stations';
import managerRouter from './routes/manager';
import uploadRouter from './routes/upload';
import adminMediaRouter from './routes/adminMedia';
import adminTranslationsRouter from './routes/adminTranslations';
import helpRouter from './routes/help';
import avatarChatRouter from './routes/avatarChat';
import avatarQuizRouter from './routes/avatarQuiz';
import analyticsRouter from './routes/analytics';
import usersRouter from './routes/users';
import missionsRouter from './routes/missions';
import collageRouter, { processPendingCollageSms } from './routes/collage';
import libraryRouter from './routes/library';
import alertsRouter from './routes/alerts';
import portalsRouter from './routes/portals';
import tutorialsRouter from './routes/tutorials';
import themesRouter from './routes/themes';
import checkAnswerRouter from './routes/checkAnswer';
import ttsRouter from './routes/tts';
import adminHelpAssistantRouter from './routes/adminHelpAssistant';
import devTasksRouter from './routes/devTasks';
import sharedStatsRouter from './routes/sharedStats';
import activityFoldersRouter from './routes/activityFolders';
import stationFoldersRouter from './routes/stationFolders';
import gameFoldersRouter from './routes/gameFolders';
import missionFoldersRouter from './routes/missionFolders';
import siteContentRouter from './routes/siteContent';
import manageRouter from './routes/manage';
import manageClientsRouter from './routes/manageClients';
import manageProjectsRouter from './routes/manageProjects';
import manageTimeRouter from './routes/manageTime';
import manageTasksRouter from './routes/manageTasks';
import manageDashboardRouter from './routes/manageDashboard';
import manageCalendarRouter from './routes/manageCalendar';
import manageFinanceRouter from './routes/manageFinance';
import manageReportsRouter from './routes/manageReports';
import manageEmployeesRouter from './routes/manageEmployees';
import manageSettingsRouter from './routes/manageSettings';
import { startManageScheduler } from './services/manageScheduler';
import { startDailyResetScheduler } from './services/activityReset';
import { startScheduledReportsScheduler } from './services/scheduledReports';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : undefined;

app.use(
  cors({
    origin: allowedOrigins ?? true,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const mongoose = (await import('mongoose')).default;
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    res.status(503).json({ status: 'down', db: dbState });
    return;
  }
  res.json({ status: 'ok', db: 'connected' });
});

app.get('/api/load-status', async (_req, res) => {
  const { getLoadSnapshot } = await import('./middleware/loadShedding');
  res.json(getLoadSnapshot());
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/reward-download', rewardDownloadRouter);
app.use('/api/admin/games', gamesRouter);
app.use('/api/admin/stations', stationsRouter);
app.use('/api/manager', managerRouter);
app.use('/api/manage', manageRouter);
app.use('/api/manage/clients', manageClientsRouter);
app.use('/api/manage/projects', manageProjectsRouter);
app.use('/api/manage/time', manageTimeRouter);
app.use('/api/manage/tasks', manageTasksRouter);
app.use('/api/manage/dashboard', manageDashboardRouter);
app.use('/api/manage/calendar', manageCalendarRouter);
app.use('/api/manage/finance', manageFinanceRouter);
app.use('/api/manage/reports', manageReportsRouter);
app.use('/api/manage/employees', manageEmployeesRouter);
app.use('/api/manage/settings', manageSettingsRouter);
app.use('/api/admin/upload', uploadRouter);
app.use('/api/admin/media', adminMediaRouter);
app.use('/api/admin/translations', adminTranslationsRouter);
app.use('/api/help', helpRouter);
app.use('/api/avatar-chat', avatarChatRouter);
app.use('/api/avatar-quiz', avatarQuizRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/shared/stats', sharedStatsRouter);
app.use('/api/admin/help-assistant', adminHelpAssistantRouter);
app.use('/api/admin/dev-tasks', devTasksRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/missions', missionsRouter);
app.use('/api/collage', collageRouter);
app.use('/api/admin/library', libraryRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/admin/portals', portalsRouter);
app.use('/api/admin/tutorials', tutorialsRouter);
app.use('/api/admin/themes', themesRouter);
app.use('/api/admin/activity-folders', activityFoldersRouter);
app.use('/api/admin/station-folders', stationFoldersRouter);
app.use('/api/admin/game-folders', gameFoldersRouter);
app.use('/api/admin/mission-folders', missionFoldersRouter);
app.use('/api/check-answer', checkAnswerRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/site-content', siteContentRouter);

app.get('/play/:code', async (req, res, next) => {
  if (!isSocialCrawler(req)) {
    next();
    return;
  }
  try {
    const activity = await Activity.findOne({ code: req.params.code }).lean();
    if (!activity) {
      res.status(404).send('Activity not found');
      return;
    }
    const origin = requestOrigin(req);
    const pageUrl = `${origin}/play/${activity.code}`;
    const imageUrl = `${origin}/images/logo-purple.png`;
    const title = activity.name ? `${activity.name} | Yooz` : 'Yooz';
    const description = activity.name?.trim() || 'Game it the YOOZ way';
    res.type('html').send(
      buildPlayOgHtml({
        pageUrl,
        title,
        description,
        imageUrl,
      }),
    );
  } catch (err) {
    console.error('OG share page error:', err);
    next();
  }
});

app.use(express.static(CLIENT_BUILD_PATH));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled route error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function start() {
  await connectDB();
  await migrateActivities();
  await migrateActivityGroups();
  await seedSuperAdmin();
  await seedManageUsers();
  await seedInternalProject();
  await dropManageProjectCodeIndex();
  startManageScheduler();
  startDailyResetScheduler();
  startScheduledReportsScheduler();
  await seedBuiltInMission();

  if (TEXTME_API_TOKEN && TEXTME_USERNAME) {
    setSmsProvider(new TextmeSmsProvider(TEXTME_API_TOKEN, TEXTME_USERNAME, TEXTME_SOURCE));
    console.log(`📱 SMS provider: textme.co.il (source: ${TEXTME_SOURCE})`);
  } else {
    console.log('📱 SMS provider: stub (set TEXTME_API_TOKEN, TEXTME_USERNAME to enable)');
  }

  const REWARD_TIMER_POLL_MS = 30_000;
  setInterval(() => {
    processExpiredRewardTimers().catch((err) => {
      console.error('[groupReward] Timer poll failed:', err);
    });
  }, REWARD_TIMER_POLL_MS);

  const COLLAGE_SMS_POLL_MS = 15_000;
  setInterval(() => {
    processPendingCollageSms().catch((err) => {
      console.error('[collage] SMS sweep failed:', err);
    });
  }, COLLAGE_SMS_POLL_MS);

  const isPrimaryWorker = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
  if (isPrimaryWorker) {
    try {
      const now = Date.now();
      const resumeFloor = new Date(now - 15 * 60 * 1000);
      const resumeCeil  = new Date(now - 30 * 1000);
      const stuck = await CollageJob.find({
        phase: { $in: ['queued', 'preparing', 'encoding', 'uploading'] },
      }).select('jobId phase updatedAt').lean();
      let resumed = 0, aborted = 0;
      for (const j of stuck) {
        if (j.updatedAt > resumeCeil) continue;
        if (j.updatedAt < resumeFloor) {
          await CollageJob.updateOne(
            { jobId: j.jobId },
            { $set: { phase: 'error', error: 'aborted due to server restart', message: 'הקידוד הופסק' } },
          );
          aborted++;
        } else {
          console.log(`[collage] resuming stuck job ${j.jobId} (phase=${j.phase})`);
          scheduleCollageEncode(j.jobId);
          resumed++;
        }
      }
      if (resumed || aborted) console.log(`[collage] boot recovery: resumed=${resumed} aborted=${aborted}`);
    } catch (err) {
      console.error('[collage] boot recovery failed:', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Yooz server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
