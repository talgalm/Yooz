import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { customerMongoFilter, customerOwnsDoc, isCustomerRole } from '../middleware/customerScope';
import { Activity, Report, AdminAuditLog } from '../models';
import {
  buildAnalyticsWorkbookBuffer,
  type AnalyticsExportType,
  type ExportActivity,
  type ExportReport,
} from '../utils/analyticsExcelExport';
import {
  clampPassThreshold,
  resolvePassThreshold,
  maxScoreForReport,
  normalizeScore,
  resolveCeiling,
} from '../utils/scoreNormalization';
import {
  getActivityAnalytics,
  getFunnel,
  getItems,
  getQuestions,
  getGroups,
  getAnomalies,
} from '../services/activityAnalyticsService';
import crypto from 'crypto';

const router = Router();

// All endpoints require admin or super_admin role
router.use(authenticateAdmin, requireRole('admin', 'super_admin', 'customer'));

function withCustomerActivityScope(req: Request, baseFilter: Record<string, unknown>): Record<string, unknown> {
  const scope = customerMongoFilter(req);
  if (!isCustomerRole(req)) return baseFilter;
  return Object.keys(baseFilter).length > 0 ? { $and: [baseFilter, scope] } : scope;
}

async function customerActivityIds(req: Request): Promise<Types.ObjectId[]> {
  if (!isCustomerRole(req)) return [];
  const activities = await Activity.find(customerMongoFilter(req), { _id: 1 }).lean();
  return activities.map((a) => new Types.ObjectId(a._id));
}

async function reportMatchForRequest(req: Request, extraMatch: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  if (!isCustomerRole(req)) return extraMatch;
  const ids = await customerActivityIds(req);
  if (ids.length === 0) return { _id: { $exists: false } };
  return {
    ...extraMatch,
    activityId: { $in: ids },
  };
}

// ─── Helper: compute median of sorted number array ───

type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year';

function analyticsPeriod(req: Request): AnalyticsPeriod {
  const period = req.query.period;
  return period === 'day' || period === 'week' || period === 'month' || period === 'year'
    ? period
    : 'year';
}

function periodStart(period: AnalyticsPeriod): Date {
  const now = new Date();
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start;
  }
  return new Date(now.getFullYear(), 0, 1);
}

function activityPeriodMatch(req: Request): Record<string, unknown> {
  return { joinedAt: { $gte: periodStart(analyticsPeriod(req)) } };
}

function activityReportMatch(activityId: string, req: Request): Record<string, unknown> {
  return {
    activityId: new Types.ObjectId(activityId),
    ...activityPeriodMatch(req),
  };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ════════════════════════════════════════════
// ─── Global Overview ───
// ════════════════════════════════════════════

router.get('/overview', async (req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const reportBaseMatch = await reportMatchForRequest(req);
  const reportTodayMatch = await reportMatchForRequest(req, { joinedAt: { $gte: todayStart } });
  const reportWeekMatch = await reportMatchForRequest(req, { joinedAt: { $gte: weekStart } });
  const reportWithScoreMatch = await reportMatchForRequest(req, { 'data.totalScore': { $exists: true } });
  const activityBaseMatch = withCustomerActivityScope(req, {});
  const activityLiveMatch = withCustomerActivityScope(req, { status: 'live' });

  const [
    totalParticipants,
    participantsToday,
    participantsThisWeek,
    totalActivities,
    activeActivities,
    allReports,
  ] = await Promise.all([
    Report.countDocuments(reportBaseMatch),
    Report.countDocuments(reportTodayMatch),
    Report.countDocuments(reportWeekMatch),
    Activity.countDocuments(activityBaseMatch),
    Activity.countDocuments(activityLiveMatch),
    Report.find(
      reportWithScoreMatch,
      { 'data.totalScore': 1, 'data.itemResults.maxPossibleScore': 1, completionStatus: 1, sessionDurationMs: 1 },
    ).lean(),
  ]);

  // Normalize every score to 0-100 against that report's own achievable maximum.
  // Activities live on wildly different raw scales, so a per-report ceiling is the
  // only meaningful denominator for a cross-activity average. Reports without
  // max-score data fall back to their raw value so legacy data still counts.
  const scores = allReports
    .map((r) => {
      const raw = (r.data as { totalScore?: number })?.totalScore ?? 0;
      if (raw <= 0) return 0;
      const ceiling = maxScoreForReport(r as { data?: { itemResults?: { maxPossibleScore?: number }[] } });
      return ceiling > 0 ? normalizeScore(raw, ceiling) : raw;
    })
    .filter((s) => s > 0);
  const durations = allReports
    .map((r) => r.sessionDurationMs)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const completedCount = allReports.filter((r) => r.completionStatus === 'completed').length;

  res.json({
    totalParticipants,
    participantsToday,
    participantsThisWeek,
    totalActivities,
    activeActivities,
    completionRate: totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    medianScore: Math.round(median(scores)),
    avgDurationMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    medianDurationMs: Math.round(median(durations)),
  });
});

// ─── Global timeline (participants per day) ───

router.get('/overview/timeline', async (req: Request, res: Response) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const match = await reportMatchForRequest(req, { joinedAt: { $gte: since } });

  const pipeline = await Report.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ timeline: pipeline.map((d) => ({ date: d._id, count: d.count })) });
});

// ════════════════════════════════════════════
// ─── Per-Activity Analytics ───
// ════════════════════════════════════════════

router.get('/activities/:id', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (!customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json(await getActivityAnalytics(activity, analyticsPeriod(req)));
});

// ─── Activity Funnel ───

router.get('/activities/:id/funnel', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json({ funnel: await getFunnel(activityId, analyticsPeriod(req), activity.excludedReportIds) });
});

// ─── Per-Item Stats ───

router.get('/activities/:id/items', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json({ items: await getItems(activityId, analyticsPeriod(req), activity.excludedReportIds) });
});

// ─── Per-Question Stats (for question-based games) ───

router.get('/activities/:id/items/:index/questions', async (req: Request<{ id: string; index: string }>, res: Response) => {
  const activityId = req.params.id;
  const itemIndex = Number(req.params.index);

  if (!Types.ObjectId.isValid(activityId) || isNaN(itemIndex)) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json({ questions: await getQuestions(activityId, itemIndex, analyticsPeriod(req), activity.excludedReportIds) });
});

// ─── Group Comparison ───

router.get('/activities/:id/groups', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json({ groups: await getGroups(activityId, analyticsPeriod(req), activity.excludedReportIds) });
});

// ─── Anomaly Detection ───

router.get('/activities/:id/anomalies', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.json({ alerts: await getAnomalies(activityId, analyticsPeriod(req), activity.excludedReportIds) });
});

// ════════════════════════════════════════════
// ─── Export (CSV / Excel) ───
// ════════════════════════════════════════════

router.get('/activities/:id/export', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  const exportType = ((req.query.type as string) || 'participants') as AnalyticsExportType;

  const validExportTypes: AnalyticsExportType[] = ['executive', 'participants', 'scores', 'progress'];
  if (!validExportTypes.includes(exportType)) {
    res.status(400).json({ error: 'Invalid export type. Must be one of: executive, participants, scores, progress' });
    return;
  }

  const sendWorkbook = async (activity: ExportActivity, reports: ExportReport[], suffix: string = exportType) => {
    const buffer = await buildAnalyticsWorkbookBuffer(activity, reports, exportType);
    const safeName = activity.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${safeName}_${suffix}_${dateStr}.xlsx`;
    const asciiName = `${safeName.replace(/[^\x20-\x7E]/g, '_')}_${suffix}_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);
  };

  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const reportFilter = await reportMatchForRequest(req, activityReportMatch(activityId, req));
  if (activity.excludedReportIds && activity.excludedReportIds.length > 0) {
    reportFilter._id = { $nin: activity.excludedReportIds.map((id) => new Types.ObjectId(id)) };
  }
  const reports = await Report.find(reportFilter).lean();
  await sendWorkbook(activity as ExportActivity, reports as ExportReport[], `${exportType}_${analyticsPeriod(req)}`);
});

// ════════════════════════════════════════════
// ─── Participants roster + exclusions ───
// ════════════════════════════════════════════

// Full roster (NOT exclusion-filtered, so excluded rows remain toggleable).
router.get('/activities/:id/participants', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId, { excludedReportIds: 1, createdByEmail: 1 }).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const reports = await Report.find(
    { activityId: new Types.ObjectId(activityId) },
    {
      participantName: 1, group: 1, completionStatus: 1, joinedAt: 1,
      'data.totalScore': 1, 'data.itemResults.itemIndex': 1, 'data.itemResults.maxPossibleScore': 1,
    },
  ).sort({ joinedAt: -1 }).lean();

  // Normalize to the same 0-100 scale the panels use.
  const rawScores = reports.map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0).filter((s) => s > 0);
  const ceiling = resolveCeiling(reports, rawScores);
  const excluded = new Set((activity.excludedReportIds ?? []).map((id) => String(id)));

  res.json({
    participants: reports.map((r) => ({
      _id: String(r._id),
      name: r.participantName || '',
      group: r.group,
      status: r.completionStatus ?? 'joined',
      score: normalizeScore((r.data as { totalScore?: number })?.totalScore ?? 0, ceiling),
      joinedAt: r.joinedAt ? new Date(r.joinedAt).toISOString() : '',
      excluded: excluded.has(String(r._id)),
    })),
  });
});

// Replace the full set of excluded report ids for this activity.
router.patch('/activities/:id/participants/exclusions', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId);
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && activity.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }
  const incoming: unknown[] = Array.isArray(req.body?.excludedReportIds) ? req.body.excludedReportIds : [];
  const ids = [...new Set(
    incoming.filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id)),
  )].map((id) => new Types.ObjectId(id));
  activity.excludedReportIds = ids;
  await activity.save();
  res.json({ excludedReportIds: ids.map((id) => String(id)) });
});

// ─── Pass grade (normalized 0-100 threshold for pass/fail in reports) ───

router.get('/activities/:id/pass-threshold', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId, { passThreshold: 1, createdByEmail: 1 }).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json({ passThreshold: resolvePassThreshold(activity.passThreshold) });
});

router.patch('/activities/:id/pass-threshold', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId);
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && activity.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }
  const passThreshold = req.body?.passThreshold === null ? null : clampPassThreshold(req.body?.passThreshold);
  activity.passThreshold = passThreshold;
  await activity.save();
  res.json({ passThreshold });
});

// ─── Public statistics share link (token management) ───

router.get('/activities/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId, { statsShareToken: 1, createdByEmail: 1 }).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json({ token: activity.statsShareToken ?? null });
});

// Create or regenerate the share token (regenerating invalidates the old link).
router.post('/activities/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId);
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && activity.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }
  activity.statsShareToken = crypto.randomBytes(24).toString('base64url');
  await activity.save();
  res.json({ token: activity.statsShareToken });
});

// Revoke the share link.
router.delete('/activities/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }
  const activity = await Activity.findById(activityId);
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && activity.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }
  activity.statsShareToken = null;
  await activity.save();
  res.json({ token: null });
});

// ════════════════════════════════════════════
// ─── Audit Log ───
// ════════════════════════════════════════════

router.get('/audit-log', async (req: Request, res: Response) => {
  if (req.admin?.role === 'customer') {
    res.status(403).json({ error: 'Forbidden: insufficient role' });
    return;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminAuditLog.countDocuments(),
  ]);

  res.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
