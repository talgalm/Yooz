import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { customerMongoFilter, customerOwnsDoc, isCustomerRole } from '../middleware/customerScope';
import { Activity, Report, AdminAuditLog } from '../models';
import * as XLSX from 'xlsx';

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
      { 'data.totalScore': 1, completionStatus: 1, sessionDurationMs: 1 },
    ).lean(),
  ]);

  const scores = allReports
    .map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0)
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

  const isMission = activity.module?.type === 'mission';

  const reports = await Report.find(
    { activityId: new Types.ObjectId(activityId) },
    {
      participantName: 1, email: 1, phoneNumber: 1, group: 1,
      joinedAt: 1, 'data.totalScore': 1, 'data.itemResults': 1, completionStatus: 1,
      sessionDurationMs: 1, totalItemsCompleted: 1, totalItemsInModule: 1,
    },
  ).lean();

  const totalParticipants = reports.length;
  const scores = reports
    .map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0)
    .filter((s) => s > 0);
  const durations = reports
    .map((r) => r.sessionDurationMs)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const completedCount = reports.filter((r) => r.completionStatus === 'completed').length;

  // Score distribution histogram (buckets of 10)
  const buckets = Array.from({ length: 11 }, (_, i) => ({ min: i * 10, max: i * 10 + 10, count: 0 }));
  scores.forEach((s) => {
    const idx = Math.min(Math.floor(s / 10), 10);
    buckets[idx].count++;
  });

  // ── Mission-specific stats (read from activity counters) ──
  let missionStats: {
    puzzleCompletions: number;
    trashSortCompletions: number;
    avgTrashSortScore: number;
  } | undefined;

  if (isMission) {
    const puzzleCompletions = activity.missionPuzzleCompletions ?? 0;
    const trashSortCompletions = activity.missionTrashSortCompletions ?? 0;
    const trashSortScoreSum = activity.missionTrashSortScoreSum ?? 0;
    missionStats = {
      puzzleCompletions,
      trashSortCompletions,
      avgTrashSortScore: trashSortCompletions > 0
        ? Math.round(trashSortScoreSum / trashSortCompletions)
        : 0,
    };
  }

  res.json({
    activity: { _id: activity._id, name: activity.name, code: activity.code, status: activity.status, moduleType: activity.module?.type },
    totalParticipants,
    completionRate: totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    medianScore: Math.round(median(scores)),
    avgDurationMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    medianDurationMs: Math.round(median(durations)),
    scoreDistribution: buckets,
    shareClicks: activity.shareClicks ?? 0,
    shareCompleted: activity.shareCompleted ?? 0,
    ...(missionStats && { missionStats }),
  });
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

  const reports = await Report.find(
    { activityId: new Types.ObjectId(activityId) },
    { completionStatus: 1, totalItemsCompleted: 1, totalItemsInModule: 1 },
  ).lean();

  const joined = reports.length;
  const startedPlaying = reports.filter((r) => (r.totalItemsCompleted ?? 0) >= 1).length;
  const completedHalf = reports.filter((r) => {
    const total = r.totalItemsInModule || 1;
    return (r.totalItemsCompleted ?? 0) >= Math.ceil(total / 2);
  }).length;
  const completed = reports.filter((r) => r.completionStatus === 'completed').length;

  res.json({
    funnel: [
      { step: 'joined', count: joined, pct: 100 },
      { step: 'started', count: startedPlaying, pct: joined > 0 ? Math.round((startedPlaying / joined) * 100) : 0 },
      { step: 'halfway', count: completedHalf, pct: joined > 0 ? Math.round((completedHalf / joined) * 100) : 0 },
      { step: 'completed', count: completed, pct: joined > 0 ? Math.round((completed / joined) * 100) : 0 },
    ],
  });
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

  const pipeline = await Report.aggregate([
    { $match: { activityId: new Types.ObjectId(activityId), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    {
      $group: {
        _id: '$data.itemResults.itemIndex',
        itemName: { $first: '$data.itemResults.itemName' },
        itemType: { $first: '$data.itemResults.itemType' },
        gameType: { $first: '$data.itemResults.gameType' },
        participantCount: { $sum: 1 },
        avgScore: { $avg: '$data.itemResults.score' },
        avgDurationMs: { $avg: '$data.itemResults.durationMs' },
        hintUsageCount: {
          $sum: { $cond: [{ $eq: ['$data.itemResults.hintUsed', true] }, 1, 0] },
        },
        completionCount: {
          $sum: { $cond: [{ $ne: ['$data.itemResults.completedAt', null] }, 1, 0] },
        },
        avgMaxScore: { $avg: '$data.itemResults.maxPossibleScore' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const items = pipeline.map((item) => ({
    itemIndex: item._id,
    itemName: item.itemName,
    itemType: item.itemType,
    gameType: item.gameType,
    participantCount: item.participantCount,
    avgScore: Math.round(item.avgScore ?? 0),
    avgDurationMs: Math.round(item.avgDurationMs ?? 0),
    hintUsagePct: item.participantCount > 0 ? Math.round((item.hintUsageCount / item.participantCount) * 100) : 0,
    completionPct: item.participantCount > 0 ? Math.round((item.completionCount / item.participantCount) * 100) : 0,
    avgMaxScore: Math.round(item.avgMaxScore ?? 0),
  }));

  res.json({ items });
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

  const pipeline = await Report.aggregate([
    { $match: { activityId: new Types.ObjectId(activityId), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    { $match: { 'data.itemResults.itemIndex': itemIndex } },
    { $unwind: '$data.itemResults.questionAnswers' },
    {
      $group: {
        _id: '$data.itemResults.questionAnswers.questionIndex',
        questionText: { $first: '$data.itemResults.questionAnswers.questionText' },
        totalAttempts: { $sum: 1 },
        correctCount: {
          $sum: { $cond: ['$data.itemResults.questionAnswers.isCorrect', 1, 0] },
        },
        avgTimeMs: { $avg: '$data.itemResults.questionAnswers.timeSpentMs' },
        avgPoints: { $avg: '$data.itemResults.questionAnswers.pointsEarned' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const questions = pipeline.map((q) => ({
    questionIndex: q._id,
    questionText: q.questionText,
    totalAttempts: q.totalAttempts,
    correctCount: q.correctCount,
    successRate: q.totalAttempts > 0 ? Math.round((q.correctCount / q.totalAttempts) * 100) : 0,
    avgTimeMs: Math.round(q.avgTimeMs ?? 0),
    avgPoints: Math.round(q.avgPoints ?? 0),
  }));

  res.json({ questions });
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

  const pipeline = await Report.aggregate([
    { $match: { activityId: new Types.ObjectId(activityId), group: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$group',
        memberCount: { $sum: 1 },
        avgScore: { $avg: '$data.totalScore' },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] },
        },
        avgDurationMs: { $avg: '$sessionDurationMs' },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);

  const groups = pipeline.map((g) => ({
    group: g._id,
    memberCount: g.memberCount,
    avgScore: Math.round(g.avgScore ?? 0),
    completionRate: g.memberCount > 0 ? Math.round((g.completedCount / g.memberCount) * 100) : 0,
    avgDurationMs: Math.round(g.avgDurationMs ?? 0),
  }));

  res.json({ groups });
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

  // Get per-item stats
  const itemStats = await Report.aggregate([
    { $match: { activityId: new Types.ObjectId(activityId), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    {
      $group: {
        _id: '$data.itemResults.itemIndex',
        itemName: { $first: '$data.itemResults.itemName' },
        participantCount: { $sum: 1 },
        completionCount: {
          $sum: { $cond: [{ $ne: ['$data.itemResults.completedAt', null] }, 1, 0] },
        },
        avgDurationMs: { $avg: '$data.itemResults.durationMs' },
      },
    },
  ]);

  const overallAvgDuration = itemStats.length > 0
    ? itemStats.reduce((s, i) => s + (i.avgDurationMs ?? 0), 0) / itemStats.length
    : 0;

  const alerts: { type: string; severity: 'warning' | 'error'; message: string; itemIndex?: number; itemName?: string }[] = [];

  for (const item of itemStats) {
    const completionRate = item.participantCount > 0 ? item.completionCount / item.participantCount : 1;
    const avgDur = item.avgDurationMs ?? 0;

    if (completionRate < 0.7) {
      alerts.push({
        type: 'high_dropout',
        severity: completionRate < 0.5 ? 'error' : 'warning',
        message: `"${item.itemName}" has ${Math.round((1 - completionRate) * 100)}% dropout rate`,
        itemIndex: item._id,
        itemName: item.itemName,
      });
    }

    if (overallAvgDuration > 0 && avgDur > overallAvgDuration * 2) {
      alerts.push({
        type: 'unusual_time',
        severity: 'warning',
        message: `"${item.itemName}" takes ${Math.round(avgDur / 1000)}s avg — ${Math.round(avgDur / overallAvgDuration)}x the average`,
        itemIndex: item._id,
        itemName: item.itemName,
      });
    }
  }

  res.json({ alerts });
});

// ════════════════════════════════════════════
// ─── Export (CSV / Excel) ───
// ════════════════════════════════════════════

router.get('/activities/:id/export', async (req: Request<{ id: string }>, res: Response) => {
  const activityId = req.params.id;
  const exportType = (req.query.type as string) || 'participants';

  const validExportTypes = ['participants', 'scores', 'progress'];
  if (!validExportTypes.includes(exportType)) {
    res.status(400).json({ error: 'Invalid export type. Must be one of: participants, scores, progress' });
    return;
  }

  if (!Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activity ID' });
    return;
  }

  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const reportFilter = await reportMatchForRequest(req, { activityId: new Types.ObjectId(activityId) });
  const reports = await Report.find(reportFilter).lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: Record<string, any>[] = [];
  let sheetName = 'Data';

  if (exportType === 'participants') {
    sheetName = 'Participants';
    rows = reports.map((r, i) => ({
      '#': i + 1,
      Name: r.participantName,
      Email: r.email || '',
      Phone: r.phoneNumber || '',
      Group: r.group || '',
      'Joined At': r.joinedAt ? new Date(r.joinedAt).toISOString() : '',
      Status: r.completionStatus || 'joined',
      'Total Score': (r.data as { totalScore?: number })?.totalScore ?? 0,
    }));
  } else if (exportType === 'scores') {
    sheetName = 'Scores';
    rows = reports.map((r, i) => {
      const data = (r.data || {}) as { totalScore?: number; scores?: { gameName: string; score: number }[] };
      const row: Record<string, unknown> = {
        '#': i + 1,
        Name: r.participantName,
        Group: r.group || '',
        'Total Score': data.totalScore ?? 0,
        'Completion': r.completionStatus || 'joined',
        'Duration (s)': r.sessionDurationMs ? Math.round(r.sessionDurationMs / 1000) : '',
      };
      // Add per-game columns
      (data.scores || []).forEach((s, j) => {
        row[`Game ${j + 1}: ${s.gameName ?? ''}`] = s?.score ?? 0;
      });
      return row;
    });
  } else if (exportType === 'progress') {
    sheetName = 'Progress';
    rows = reports.map((r, i) => ({
      '#': i + 1,
      Name: r.participantName,
      Group: r.group || '',
      Status: r.completionStatus || 'joined',
      'Items Completed': r.totalItemsCompleted ?? 0,
      'Total Items': r.totalItemsInModule ?? '',
      'Last Active Item': r.lastActiveItemIndex ?? 0,
      'Session Duration (s)': r.sessionDurationMs ? Math.round(r.sessionDurationMs / 1000) : '',
      'Joined At': r.joinedAt ? new Date(r.joinedAt).toISOString() : '',
      'Completed At': r.sessionCompletedAt ? new Date(r.sessionCompletedAt).toISOString() : '',
    }));
  }

  // Generate Excel workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const safeName = activity.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}_${exportType}_${dateStr}.xlsx`;
  const asciiName = `${safeName.replace(/[^\x20-\x7E]/g, '_')}_${exportType}_${dateStr}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(buffer);
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
