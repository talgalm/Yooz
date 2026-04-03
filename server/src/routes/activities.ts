import { Router, Request, Response } from 'express';
import { ActivityConfigResponse } from '../types';
import { authenticateToken } from '../middleware/auth';
import { Activity, Report, Game, Station, Mission } from '../models';

const router = Router();

// Public: get activity config by code (for /play/:code)
router.get('/:code', async (req: Request<{ code: string }>, res: Response<ActivityConfigResponse | { error: string }>) => {
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  // Backward compat: if old activity with loginComponent but no loginFields
  let loginFields = activity.loginFields || [];
  let emailGoogle = activity.emailGoogle;
  let connectionType = activity.connectionType || 'single';

  if (loginFields.length === 0 && activity.loginComponent) {
    if (activity.loginComponent === 'academy') {
      loginFields = ['email'];
      emailGoogle = true;
    } else {
      loginFields = ['name'];
    }
    connectionType = 'single';
  }

  res.json({
    code: activity.code,
    name: activity.name,
    loginFields: loginFields as ActivityConfigResponse['loginFields'],
    ...(emailGoogle && { emailGoogle: true }),
    connectionType: connectionType as ActivityConfigResponse['connectionType'],
    groups: activity.groups || [],
    ...(activity.opening && { opening: { type: activity.opening.type, url: activity.opening.url } }),
    ...(activity.scheduledStart && { scheduledStart: activity.scheduledStart.toISOString() }),
    ...(activity.scheduledEnd && { scheduledEnd: activity.scheduledEnd.toISOString() }),
    ...(activity.module && { moduleType: activity.module.type }),
    ...(activity.isContinuous && { isContinuous: true }),
  });
});

// Public: get full activity module config by code (for participant game flow)
router.get('/:code/module', async (req: Request<{ code: string }>, res: Response) => {
  const activity = await Activity.findOne({ code: req.params.code }).lean();

  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  if (!activity.module) {
    res.status(404).json({ error: 'No module configured for this activity' });
    return;
  }

  // Handle mission module type
  if (activity.module.type === 'mission' && activity.module.missionRef) {
    const mission = await Mission.findById(activity.module.missionRef).lean();
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }
    res.json({
      code: activity.code,
      name: activity.name,
      module: {
        type: 'mission',
        mission: {
          _id: mission._id,
          name: mission.name,
          explanationScreens: mission.explanationScreens,
          puzzleConfig: mission.puzzleConfig,
          trashSortConfig: mission.trashSortConfig,
        },
      },
    });
    return;
  }

  // Collect IDs by type from module items
  const gameIds: string[] = [];
  const stationIds: string[] = [];
  const missionIds: string[] = [];
  for (const item of activity.module.items || []) {
    if (item.type === 'game') gameIds.push(item.ref.toString());
    else if (item.type === 'station') stationIds.push(item.ref.toString());
    else if (item.type === 'mission') missionIds.push(item.ref.toString());
  }

  // Batch fetch games, stations, and missions
  const [games, stations, missions] = await Promise.all([
    gameIds.length > 0 ? Game.find({ _id: { $in: gameIds } }).lean() : [],
    stationIds.length > 0 ? Station.find({ _id: { $in: stationIds } }).lean() : [],
    missionIds.length > 0 ? Mission.find({ _id: { $in: missionIds } }).lean() : [],
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameMap = new Map(games.map((g: any) => [g._id.toString(), g]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stationMap = new Map(stations.map((s: any) => [s._id.toString(), s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missionMap = new Map(missions.map((m: any) => [m._id.toString(), m]));

  // Filter items by participant group (if activity uses groups)
  // The participant's group comes from query param (set by client from JWT)
  const participantGroup = req.query.group as string | undefined;
  const moduleItems = (activity.module.items || []).filter((item) => {
    // If item has no group restriction, show to everyone
    if (!item.groups || item.groups.length === 0) return true;
    // If participant has a group, check if it's in the item's groups
    if (participantGroup) return item.groups.includes(participantGroup);
    // No group specified but item has restrictions — still show (single mode)
    return true;
  });

  // Build populated items array in order
  const populatedItems = moduleItems.map((item) => {
    if (item.type === 'mission') {
      const data = missionMap.get(item.ref.toString());
      if (!data) return null;
      return {
        type: 'mission' as const,
        _id: data._id,
        name: data.name,
        explanationScreens: data.explanationScreens || [],
        puzzleConfig: data.puzzleConfig,
        trashSortConfig: data.trashSortConfig,
      };
    }
    const data = item.type === 'game'
      ? gameMap.get(item.ref.toString())
      : stationMap.get(item.ref.toString());
    if (!data) return null;
    if (item.type === 'game') {
      return {
        type: 'game' as const,
        _id: data._id,
        name: data.name,
        gameType: data.type, // 'order', 'trivia', 'puzzle', 'trueFalse'
        description: data.description,
        settings: data.settings || {},
      };
    } else {
      return {
        type: 'station' as const,
        _id: data._id,
        name: data.name,
        stationType: data.type, // 'text', 'video', 'image'
        description: data.description,
        settings: data.settings || {},
      };
    }
  }).filter(Boolean);

  // Filter popups by conditions (e.g. participant count threshold)
  let filteredPopups: typeof activity.module.popups = [];
  if (activity.module.popups && activity.module.popups.length > 0) {
    const reportCount = await Report.countDocuments({ activityId: activity._id });
    filteredPopups = activity.module.popups.filter((p) => {
      if (!p.enabled) return false;
      if (p.condition && p.condition.type === 'participantCount') {
        return reportCount >= p.condition.threshold;
      }
      return true; // no condition = always show
    });
  }

  // Build module response with filtered popups (strip condition data — client doesn't need it)
  const moduleResponse = {
    type: activity.module.type,
    theme: activity.module.theme,
    backgroundImage: activity.module.backgroundImage,
    items: populatedItems,
    popups: filteredPopups.map((p) => ({
      _id: p._id,
      title: p.title,
      contentType: p.contentType || 'text',
      text: p.text,
      image: p.image,
      includeUsername: p.includeUsername === true,
      trigger: p.trigger,
    })),
  };

  res.json({
    code: activity.code,
    name: activity.name,
    module: moduleResponse,
    guidelines: activity.guidelines || undefined,
    customInstructions: activity.customInstructions || undefined,
    ...(activity.isContinuous && { isContinuous: true }),
  });
});

// Get leaderboard for activity (public, sorted by totalScore desc)
router.get('/:code/leaderboard', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;
  const activity = await Activity.findOne({ code });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const reports = await Report.find(
    { activityId: activity._id, 'data.totalScore': { $exists: true } },
    { participantName: 1, group: 1, data: 1 }
  )
    .sort({ 'data.totalScore': -1 })
    .limit(50)
    .lean();

  const leaderboard = reports.map((r, i) => ({
    rank: i + 1,
    name: r.participantName,
    group: r.group,
    score: (r.data as { totalScore?: number }).totalScore ?? 0,
  }));

  res.json({ leaderboard });
});

// Save incremental progress after each game/station
router.patch('/:code/progress', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { itemResult, totalItemsCompleted, lastActiveItemIndex, runningTotal } = req.body;
  const { activityCode, participantName } = req.participant!;

  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!itemResult || typeof itemResult.itemIndex !== 'number') {
    res.status(400).json({ error: 'itemResult with itemIndex is required' });
    return;
  }

  const updateOps: Record<string, unknown> = {
    completionStatus: 'in_progress',
    lastActiveItemIndex: lastActiveItemIndex ?? itemResult.itemIndex,
  };
  if (typeof totalItemsCompleted === 'number') {
    updateOps.totalItemsCompleted = totalItemsCompleted;
  }
  if (typeof runningTotal === 'number' && isFinite(runningTotal)) {
    updateOps['data.totalScore'] = runningTotal;
  }

  // Prevent duplicate itemResults for the same itemIndex
  const report = await Report.findOneAndUpdate(
    {
      activityCode,
      participantName,
      'data.itemResults.itemIndex': { $ne: itemResult.itemIndex },
    },
    {
      $push: { 'data.itemResults': itemResult },
      $set: updateOps,
    },
    { new: true, sort: { joinedAt: -1 } },
  );

  // If no doc matched, it may be a duplicate — still update progress fields
  if (!report) {
    const fallback = await Report.findOneAndUpdate(
      { activityCode, participantName },
      { $set: updateOps },
      { new: true, sort: { joinedAt: -1 } },
    );
    if (!fallback) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
  }

  res.json({ success: true });
});

// Delete participant's report (continuous activity early exit)
router.delete('/:code/my-report', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { activityCode, participantName } = req.participant!;
  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity || !activity.isContinuous) {
    res.status(400).json({ error: 'Not a continuous activity' });
    return;
  }

  await Report.deleteMany({ activityCode, participantName });
  res.json({ success: true });
});

// Get current participant's progress (for session resume)
router.get('/:code/my-progress', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { activityCode, participantName } = req.participant!;

  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const report = await Report.findOne(
    { activityCode, participantName },
    { completionStatus: 1, lastActiveItemIndex: 1, totalItemsCompleted: 1, data: 1 },
  ).sort({ joinedAt: -1 }).lean();

  if (!report) {
    res.json({ completionStatus: 'joined', lastActiveItemIndex: 0, totalItemsCompleted: 0 });
    return;
  }

  const data = report.data as { scores?: { gameName: string; score: number }[]; itemResults?: unknown[] };
  res.json({
    completionStatus: report.completionStatus,
    lastActiveItemIndex: report.lastActiveItemIndex,
    totalItemsCompleted: report.totalItemsCompleted,
    scores: data?.scores,
    itemResults: data?.itemResults,
  });
});

// Save scores for participant (final save — also marks session complete)
router.post('/:code/scores', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { scores, sessionDurationMs } = req.body;
  const { activityCode, participantName } = req.participant!;

  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!Array.isArray(scores)) {
    res.status(400).json({ error: 'Scores must be an array' });
    return;
  }

  // Validate each score entry
  const isValid = scores.every((s: unknown) =>
    typeof s === 'object' && s !== null &&
    typeof (s as { gameName?: unknown }).gameName === 'string' &&
    typeof (s as { score?: unknown }).score === 'number' &&
    isFinite((s as { score: number }).score)
  );
  if (!isValid) {
    res.status(400).json({ error: 'Each score must have gameName (string) and score (number)' });
    return;
  }

  if (typeof sessionDurationMs !== 'undefined' && (typeof sessionDurationMs !== 'number' || sessionDurationMs < 0)) {
    res.status(400).json({ error: 'sessionDurationMs must be a positive number' });
    return;
  }

  const totalScore = scores.reduce((sum: number, s: { score: number }) => sum + (s.score || 0), 0);

  const updateOps: Record<string, unknown> = {
    'data.scores': scores,
    'data.totalScore': totalScore,
    completionStatus: 'completed',
    sessionCompletedAt: new Date(),
  };
  if (typeof sessionDurationMs === 'number') {
    updateOps.sessionDurationMs = sessionDurationMs;
  }

  const report = await Report.findOneAndUpdate(
    { activityCode, participantName },
    { $set: updateOps },
    { new: true, sort: { joinedAt: -1 } },
  );

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json({ success: true });
});

export default router;
