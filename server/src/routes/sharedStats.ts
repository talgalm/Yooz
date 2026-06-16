import { Router, Request, Response } from 'express';
import { Activity } from '../models';
import {
  getActivityAnalytics,
  getFunnel,
  getItems,
  getQuestions,
  getGroups,
  getAnomalies,
  getExportReports,
  parsePeriod,
  type AnalyticsActivity,
} from '../services/activityAnalyticsService';
import {
  buildAnalyticsWorkbookBuffer,
  type AnalyticsExportType,
  type ExportActivity,
  type ExportReport,
} from '../utils/analyticsExcelExport';

// ─────────────────────────────────────────────────────────────
// Public, read-only statistics share links.
//
// There is NO admin auth here — the unguessable per-activity share token in
// the URL is the only credential, and it grants read-only access to exactly
// one activity's statistics (and its Excel exports). No mutation, no other
// activity, no admin surface.
// ─────────────────────────────────────────────────────────────

const router = Router();

type ShareActivity = AnalyticsActivity & {
  _id: unknown;
  name: string;
  code: string;
  status: string;
  connectionType?: string;
  module?: { type?: string; items?: unknown[] };
};

// Resolve the :token param to its activity, or send 404.
async function resolveActivity(req: Request, res: Response): Promise<ShareActivity | null> {
  const token = req.params.token;
  // Real tokens are 32+ url-safe chars; reject anything that could match a
  // null/empty stored token.
  if (typeof token !== 'string' || token.length < 16) {
    res.status(404).json({ error: 'Share link not found' });
    return null;
  }
  const activity = await Activity.findOne({ statsShareToken: token }).lean();
  if (!activity) {
    res.status(404).json({ error: 'Share link not found or revoked' });
    return null;
  }
  return activity as unknown as ShareActivity;
}

router.get('/:token', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  res.json(await getActivityAnalytics(activity, parsePeriod(req.query.period)));
});

router.get('/:token/funnel', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  res.json({ funnel: await getFunnel(String(activity._id), parsePeriod(req.query.period), activity.excludedReportIds) });
});

router.get('/:token/items', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  res.json({ items: await getItems(String(activity._id), parsePeriod(req.query.period), activity.excludedReportIds) });
});

router.get('/:token/items/:index/questions', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  const itemIndex = Number(req.params.index);
  if (Number.isNaN(itemIndex)) {
    res.status(400).json({ error: 'Invalid item index' });
    return;
  }
  res.json({ questions: await getQuestions(String(activity._id), itemIndex, parsePeriod(req.query.period), activity.excludedReportIds) });
});

router.get('/:token/groups', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  res.json({ groups: await getGroups(String(activity._id), parsePeriod(req.query.period), activity.excludedReportIds) });
});

router.get('/:token/anomalies', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;
  res.json({ alerts: await getAnomalies(String(activity._id), parsePeriod(req.query.period), activity.excludedReportIds) });
});

router.get('/:token/export', async (req: Request, res: Response) => {
  const activity = await resolveActivity(req, res);
  if (!activity) return;

  const exportType = ((req.query.type as string) || 'participants') as AnalyticsExportType;
  const validExportTypes: AnalyticsExportType[] = ['executive', 'participants', 'scores', 'progress'];
  if (!validExportTypes.includes(exportType)) {
    res.status(400).json({ error: 'Invalid export type. Must be one of: executive, participants, scores, progress' });
    return;
  }

  const period = parsePeriod(req.query.period);
  const reports = await getExportReports(String(activity._id), period, activity.excludedReportIds);
  const buffer = await buildAnalyticsWorkbookBuffer(activity as unknown as ExportActivity, reports as ExportReport[], exportType);

  const safeName = activity.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = `${exportType}_${period}`;
  const fileName = `${safeName}_${suffix}_${dateStr}.xlsx`;
  const asciiName = `${safeName.replace(/[^\x20-\x7E]/g, '_')}_${suffix}_${dateStr}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(buffer);
});

export default router;
