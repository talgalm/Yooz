import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ActivityConfigResponse, JwtPayload } from '../types';
import { JWT_SECRET } from '../config';
import { authenticateToken } from '../middleware/auth';
import { Activity, Report, Game, Station, Mission, CustomTheme, MapGroupState } from '../models';
import mongoose from 'mongoose';
import { subscribe, sendLockEvent } from '../utils/lockBroadcaster';
import { getParticipantCount } from '../utils/participantCountCache';
import { getOrderSurveyLiveState } from '../utils/orderSurveySession';
import { getGroupStatus } from '../utils/groupStatus';
import { ownReportFilter } from '../utils/participantAuth';
import { resolveCeiling, normalizeScore } from '../utils/scoreNormalization';
import { startOfTodayIsrael, israelDayString } from '../utils/israelTime';
import { readLang } from '../utils/requestLang';
import { translateContent } from '../services/contentTranslation';
import { visibleOrderedIndices } from '../utils/moduleItems';
import { onGroupMemberCompleted } from '../services/groupRewardService';
import activityGroupsRouter from './activityGroups';
import mapRunRouter from './mapRun';

const router = Router();

const activityConfigCache = new Map<string, { data: ActivityConfigResponse; expiresAt: number }>();
const ACTIVITY_CONFIG_TTL_MS = 30_000;

/**
 * Strip answer keys before a station's settings go to the browser.
 *
 * avatarQuiz judges answers server-side (POST /api/avatar-quiz) precisely so
 * `idealAnswer` never ships. Without this filter any participant could read
 * every answer out of the Network tab before typing a word.
 */
function publicStationSettings(
  stationType: string,
  settings: Record<string, unknown>
): Record<string, unknown> {
  if (stationType !== 'avatarQuiz') return settings;
  const questions = Array.isArray(settings.questions) ? settings.questions : [];
  return {
    ...settings,
    questions: questions.map((raw) => {
      const q = (raw || {}) as Record<string, unknown>;
      // Allow-list, not a delete-list: a field added to the config later must
      // be opted in here explicitly rather than leaking by default.
      return {
        text: q.text,
        mediaUrl: q.mediaUrl,
        mediaType: q.mediaType,
        hint: q.hint,
        points: q.points,
        learnMoreUrl: q.learnMoreUrl,
        level: q.level,
      };
    }),
  };
}

// Group self-service routes — must be registered before /:code
router.use(activityGroupsRouter);
router.use(mapRunRouter);

// Public: get activity config by code (for /play/:code)
router.get('/:code', async (req: Request<{ code: string }>, res: Response<ActivityConfigResponse | { error: string }>) => {
  const { code } = req.params;
  const cached = activityConfigCache.get(code);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const activity = await Activity.findOne({ code });
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

  const data: ActivityConfigResponse = {
    code: activity.code,
    name: activity.name,
    loginFields: loginFields as ActivityConfigResponse['loginFields'],
    ...(emailGoogle && { emailGoogle: true }),
    connectionType: connectionType as ActivityConfigResponse['connectionType'],
    ...(connectionType === 'group' && activity.groupEntryMode && { groupEntryMode: activity.groupEntryMode }),
    groups: activity.groups || [],
    ...(activity.opening && { opening: { type: activity.opening.type, url: activity.opening.url } }),
    ...(activity.scheduledStart && { scheduledStart: activity.scheduledStart.toISOString() }),
    ...(activity.scheduledEnd && { scheduledEnd: activity.scheduledEnd.toISOString() }),
    ...(activity.module && { moduleType: activity.module.type }),
    ...(activity.isContinuous && { isContinuous: true }),
    ...(activity.organizerContactName && activity.organizerContactPhone && {
      organizerContactName: activity.organizerContactName,
      organizerContactPhone: activity.organizerContactPhone,
    }),
    ...(activity.helpCategoriesDisabled?.length && { helpCategoriesDisabled: activity.helpCategoriesDisabled }),
    ...(activity.helpCategoryResponses && Object.keys(activity.helpCategoryResponses).length > 0 && {
      helpCategoryResponses: activity.helpCategoryResponses,
    }),
    ...(activity.helpOtherCategoryEnabled === true && { helpOtherCategoryEnabled: true }),
  };

  activityConfigCache.set(code, { data, expiresAt: Date.now() + ACTIVITY_CONFIG_TTL_MS });
  res.json(data);
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

  let participantGroup = req.query.group as string | undefined;

  if (activity.connectionType === 'group' && activity.groupEntryMode === 'selfService') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'group_auth_required' });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      if (decoded.activityCode !== req.params.code || !decoded.group) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      const status = await getGroupStatus(activity, decoded.group);
      if (!status?.canProceed) {
        res.status(403).json({ error: 'group_not_ready', ...status });
        return;
      }
      participantGroup = decoded.group;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
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

  // Hide items this group isn't addressed to, then apply the group's own
  // visiting order (map modules). Both shift indices — the client's 0..n-1 is
  // the index space progress is recorded in.
  const moduleItems = visibleOrderedIndices(activity.module, participantGroup)
    .map((i) => activity.module!.items[i]);

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
        spiderSvg: item.spiderSvg,
        ...(item.isFinal && { isFinal: true }),
        ...(item.revisitable && { revisitable: true }),
        ...(item.location && { location: item.location }),
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
        spiderSvg: item.spiderSvg,
        ...(item.isFinal && { isFinal: true }),
        ...(item.revisitable && { revisitable: true }),
        ...(item.location && { location: item.location }),
      };
    } else {
      return {
        type: 'station' as const,
        _id: data._id,
        name: data.name,
        stationType: data.type, // 'text', 'video', 'image'
        description: data.description,
        settings: publicStationSettings(data.type, data.settings || {}),
        spiderSvg: item.spiderSvg,
        ...(item.isFinal && { isFinal: true }),
        ...(item.revisitable && { revisitable: true }),
        ...(item.collageSplit && { collageSplit: item.collageSplit }),
        ...(item.location && { location: item.location }),
      };
    }
  }).filter(Boolean);

  // Filter popups by conditions (e.g. participant count threshold)
  let filteredPopups: typeof activity.module.popups = [];
  if (activity.module.popups && activity.module.popups.length > 0) {
    const reportCount = await getParticipantCount(activity._id, activity.dailyReset === true);
    filteredPopups = activity.module.popups.filter((p) => {
      if (!p.enabled) return false;
      if (p.condition && p.condition.type === 'participantCount') {
        return reportCount >= p.condition.threshold;
      }
      return true; // no condition = always show
    });
  }

  // If theme is a custom theme ID, fetch and embed it so the client doesn't need a second request
  let customThemeData: {
    mainColor: string;
    roadmapImage?: string;
    stationsImage?: string;
    textColor?: string;
    bgColor?: string;
    roadmapActiveNodeColor?: string;
    roadmapPathColor?: string;
    headerIconColor?: string;
  } | undefined;
  if (activity.module.theme && mongoose.isValidObjectId(activity.module.theme)) {
    const ct = await CustomTheme.findById(activity.module.theme).lean();
    if (ct) {
      customThemeData = {
        mainColor: ct.mainColor,
        roadmapImage: ct.roadmapImage,
        stationsImage: ct.stationsImage,
        textColor: ct.textColor,
        bgColor: ct.bgColor,
        roadmapActiveNodeColor: ct.roadmapActiveNodeColor,
        roadmapPathColor: ct.roadmapPathColor,
        headerIconColor: ct.headerIconColor,
      };
    }
  }

  // Build module response with filtered popups (strip condition data — client doesn't need it)
  const moduleResponse = {
    type: activity.module.type,
    theme: activity.module.theme,
    customTheme: customThemeData,
    backgroundImage: activity.module.backgroundImage,
    ...(activity.module.showStationNumbers && { showStationNumbers: true }),
    ...(activity.module.showItemTitleNumbers && { showItemTitleNumbers: true }),
    ...(activity.module.proximityMeters && { proximityMeters: activity.module.proximityMeters }),
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

  res.setHeader('Cache-Control', 'no-store');
  /**
   * Everything below this line is admin-authored content, so a participant
   * running in another language gets it translated. Hebrew is a no-op, and a
   * translation that cannot be produced falls back to the Hebrew it was given.
   */
  const lang = readLang(req);
  res.json(await translateContent({
    code: activity.code,
    name: activity.name,
    module: moduleResponse,
    guidelines: activity.guidelines || undefined,
    customInstructions: activity.customInstructions || undefined,
    ...(activity.isContinuous && { isContinuous: true }),
    leaderboardMode: activity.leaderboardMode || 'points',
    ...(activity.leaderboardAsGrade && { leaderboardAsGrade: true }),
    ...(activity.hideLeaderboardInHeader && { hideLeaderboardInHeader: true }),
    ...(activity.activityDurationMinutes && { activityDurationMinutes: activity.activityDurationMinutes }),
    ...(activity.roadmapTimerMinutes && { roadmapTimerMinutes: activity.roadmapTimerMinutes }),
    lockedFromIndex: typeof activity.lockedFromIndex === 'number' ? activity.lockedFromIndex : null,
    ...(activity.includeOnRoadmap && { includeOnRoadmap: true }),
    ...(activity.smsForCollage && { smsForCollage: true }),
  }, lang));
});

// SSE: live updates of the manager-controlled progress lock for an activity.
// Public stream — nothing sensitive flows through it.
router.get('/:code/lock-stream', async (req: Request<{ code: string }>, res: Response) => {
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering (nginx)
  res.flushHeaders?.();

  // Initial payload: current state.
  const initial = typeof activity.lockedFromIndex === 'number' ? activity.lockedFromIndex : null;
  sendLockEvent(res, initial);

  // Heartbeat every 25s to keep the connection alive through proxies.
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* ignore */ }
  }, 25000);

  const unsubscribe = subscribe(activity.code, res);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// Get leaderboard for activity (public)
router.get('/:code/leaderboard', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;
  const activity = await Activity.findOne({ code });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const isTimeMode = activity.leaderboardMode === 'time';
  const isBothMode = activity.leaderboardMode === 'both';
  // Show points as a normalized 0-100 grade (never applies to time-only mode).
  // Normalization is monotonic, so ranks stay correct without re-sorting.
  const asGrade = activity.leaderboardAsGrade === true && !isTimeMode;
  const gradeScore = (raw: number, ceiling: number) => (asGrade ? normalizeScore(raw, ceiling) : raw);

  // Group activities show every teammate of the viewer's group, so the row cap
  // has to clear all groups combined — not just the top handful overall.
  const rowLimit = activity.connectionType === 'group' ? 500 : 50;

  // Default ON (undefined → true) — matches the model default. `dailyReset`
  // forces it: that activity's whole promise is a board that starts empty each
  // morning, and its reports are now kept rather than deleted, so nothing else
  // hides yesterday from the participants.
  const currentDayOnly = activity.dailyReset === true || activity.leaderboardCurrentDayOnly !== false;
  const dateFilter: Record<string, unknown> = {};
  if (currentDayOnly) {
    // Reports have no createdAt (schema has no timestamps) — joinedAt is the creation time.
    dateFilter.joinedAt = { $gte: startOfTodayIsrael() };
  }

  let leaderboard;
  if (isTimeMode) {
    const reports = await Report.find(
      { activityId: activity._id, completionStatus: 'completed', sessionDurationMs: { $exists: true, $gt: 0 }, ...dateFilter },
      { participantName: 1, group: 1, sessionDurationMs: 1 }
    )
      .sort({ sessionDurationMs: 1 })
      .limit(rowLimit)
      .lean();

    leaderboard = reports.map((r, i) => ({
      rank: i + 1,
      name: r.participantName,
      group: r.group,
      score: 0,
      durationMs: r.sessionDurationMs as number,
    }));
  } else if (isBothMode) {
    // Rank primarily by points (desc); duration is shown alongside but not a
    // tiebreaker (kept simple — most natural reading is "leaderboard by score,
    // with how long it took").
    const reports = await Report.find(
      { activityId: activity._id, 'data.totalScore': { $exists: true }, ...dateFilter },
      { participantName: 1, group: 1, data: 1, sessionDurationMs: 1 }
    )
      .sort({ 'data.totalScore': -1 })
      .limit(rowLimit)
      .lean();

    const ceiling = asGrade ? resolveCeiling(reports, reports.map((r) => (r.data as { totalScore?: number }).totalScore ?? 0)) : 0;
    leaderboard = reports.map((r, i) => ({
      rank: i + 1,
      name: r.participantName,
      group: r.group,
      score: gradeScore((r.data as { totalScore?: number }).totalScore ?? 0, ceiling),
      durationMs: typeof r.sessionDurationMs === 'number' ? r.sessionDurationMs : undefined,
    }));
  } else {
    const reports = await Report.find(
      { activityId: activity._id, 'data.totalScore': { $exists: true }, ...dateFilter },
      { participantName: 1, group: 1, data: 1 }
    )
      .sort({ 'data.totalScore': -1 })
      .limit(rowLimit)
      .lean();

    const ceiling = asGrade ? resolveCeiling(reports, reports.map((r) => (r.data as { totalScore?: number }).totalScore ?? 0)) : 0;
    leaderboard = reports.map((r, i) => ({
      rank: i + 1,
      name: r.participantName,
      group: r.group,
      score: gradeScore((r.data as { totalScore?: number }).totalScore ?? 0, ceiling),
    }));
  }

  // Group activities: also return per-group standings (sum of member scores).
  // ponytail: time-mode group ranking not supported — groups always rank by points.
  let groups;
  if (activity.module?.type === 'map') {
    // A map activity's team score is kept on the shared run: only one member
    // plays each station, so summing members' reports would still be right but
    // the run doc is what the map itself is scored against.
    const runs = await MapGroupState.find(
      { activityId: activity._id, activityDay: israelDayString() },
      { groupName: 1, score: 1, completedIndices: 1 },
    ).sort({ score: -1 }).lean();
    // No `members` here: the run doc doesn't track headcount, and inventing a
    // number for a field nobody renders is worse than leaving it out.
    groups = runs.map((r, i) => ({
      rank: i + 1,
      name: r.groupName,
      score: r.score || 0,
      completed: (r.completedIndices || []).length,
    }));
  } else if (activity.connectionType === 'group') {
    const agg = await Report.aggregate([
      { $match: { activityId: activity._id, group: { $type: 'string', $ne: '' }, 'data.totalScore': { $exists: true }, ...dateFilter } },
      { $group: { _id: '$group', score: { $sum: '$data.totalScore' }, members: { $sum: 1 } } },
      { $sort: { score: -1 } },
      { $limit: 50 },
    ]);
    groups = agg.map((g, i) => ({ rank: i + 1, name: g._id as string, score: g.score as number, members: g.members as number }));
  }

  res.json({ leaderboard, ...(groups && { groups }), leaderboardMode: activity.leaderboardMode || 'points', leaderboardAsGrade: asGrade });
});

// Save incremental progress after each game/station
router.patch('/:code/progress', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { itemResult, totalItemsCompleted, lastActiveItemIndex, runningTotal, progressOnly } = req.body;
  const { activityCode, participantName } = req.participant!;

  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!progressOnly) {
    if (!itemResult || typeof itemResult.itemIndex !== 'number') {
      res.status(400).json({ error: 'itemResult with itemIndex is required' });
      return;
    }
  }

  const updateOps: Record<string, unknown> = {
    completionStatus: 'in_progress',
    lastActiveItemIndex: lastActiveItemIndex ?? itemResult?.itemIndex,
  };
  if (typeof totalItemsCompleted === 'number') {
    updateOps.totalItemsCompleted = totalItemsCompleted;
  }
  if (typeof runningTotal === 'number' && isFinite(runningTotal)) {
    updateOps['data.totalScore'] = runningTotal;
  }

  const updatePayload: Record<string, unknown> = { $set: updateOps };
  if (!progressOnly && itemResult) {
    updatePayload.$push = { 'data.itemResults': itemResult };
  }

  // Never touch a report that already finished. A progress PATCH can land after
  // the final save — replayed from the offline queue, or a second tab — and
  // `completionStatus: 'in_progress'` would drag the finished run backwards,
  // dropping the participant off the leaderboard (time mode counts only
  // completed reports). Late progress is stale by definition; ignore it.
  const report = await Report.findOneAndUpdate(
    { ...ownReportFilter(req.participant!), completionStatus: { $ne: 'completed' } },
    updatePayload,
    { new: true, sort: { joinedAt: -1 } },
  );

  // No match = already completed, or the report is gone (the final save
  // rebuilds it). Either way there is nothing a retry could fix, so don't hand
  // the client a failure it would queue and replay forever.
  res.json({ success: true, ...(report ? {} : { ignored: true }) });
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

  await Report.deleteMany(ownReportFilter(req.participant!));
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
    ownReportFilter(req.participant!),
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

// Order survey session status (for participants waiting after submit)
router.get('/:code/order-survey/status', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { activityCode } = req.participant!;
  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const live = await getOrderSurveyLiveState(activity);
  res.json(live);
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

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const updateOps: Record<string, unknown> = {
    'data.scores': scores,
    'data.totalScore': totalScore,
    completionStatus: 'completed',
    sessionCompletedAt: new Date(),
  };
  if (typeof sessionDurationMs === 'number') {
    updateOps.sessionDurationMs = sessionDurationMs;
  }

  // Upsert, not update: the final save is the participant's only record of a
  // finished run, and a 404 here is unrecoverable for them (the client retries
  // the same failing request forever behind a "could not save" banner). The
  // report can legitimately be gone — flipping the activity to `live` wipes all
  // reports, and a continuous-activity early exit deletes the participant's —
  // so rebuild it from the token rather than dropping the scores on the floor.
  // ponytail: two concurrent saves for a participant with no report (retry timer
  // racing an offline-queue flush) could each insert one. Both would carry the
  // same scores, so the cost is a duplicate leaderboard row, not lost data —
  // add a unique index on (activityCode, participantName) if it ever shows up.
  // Insert-only fields the filter no longer carries: an `_id` filter says
  // nothing about who the report belongs to, so name them explicitly (they must
  // NOT be repeated when the legacy filter already matches on them).
  const ownFilter = ownReportFilter(req.participant!);
  const report = await Report.findOneAndUpdate(
    ownFilter,
    {
      $set: updateOps,
      $setOnInsert: {
        activityId: activity._id,
        ...(ownFilter._id ? { activityCode, participantName } : {}),
        connectionType: req.participant!.connectionType || 'single',
        ...(req.participant!.email && { email: req.participant!.email }),
        ...(req.participant!.phoneNumber && { phoneNumber: req.participant!.phoneNumber }),
        ...(req.participant!.group && { group: req.participant!.group }),
      },
    },
    { new: true, sort: { joinedAt: -1 }, upsert: true, setDefaultsOnInsert: true },
  );

  if (report.group && activity.groupEntryMode === 'selfService') {
    onGroupMemberCompleted(activity, report.group).catch((err) => {
      console.error('[groupReward] Failed to process reward:', err);
    });
  }

  res.json({ success: true });
});

// Track mission phase completions (public — no auth required)
router.post('/:code/mission-event', async (req: Request<{ code: string }>, res: Response) => {
  const { event, score } = req.body as { event?: string; score?: number };
  const validEvents = ['puzzle_completed', 'trashsort_completed'];
  if (!validEvents.includes(event ?? '')) {
    res.status(400).json({ error: 'event must be "puzzle_completed" or "trashsort_completed"' });
    return;
  }
  const inc: Record<string, number> = {};
  if (event === 'puzzle_completed') {
    inc.missionPuzzleCompletions = 1;
  } else {
    inc.missionTrashSortCompletions = 1;
    inc.missionTrashSortScoreSum = typeof score === 'number' ? score : 0;
  }
  await Activity.findOneAndUpdate({ code: req.params.code }, { $inc: inc });
  res.json({ success: true });
});

// Track share button events (public — no auth required)
router.post('/:code/share-event', async (req: Request<{ code: string }>, res: Response) => {
  const { event } = req.body as { event?: string };
  if (event !== 'click' && event !== 'completed') {
    res.status(400).json({ error: 'event must be "click" or "completed"' });
    return;
  }

  const field = event === 'click' ? 'shareClicks' : 'shareCompleted';
  await Activity.findOneAndUpdate(
    { code: req.params.code },
    { $inc: { [field]: 1 } },
  );

  res.json({ success: true });
});

export default router;
