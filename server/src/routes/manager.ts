import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';
import { authenticateManager } from '../middleware/managerAuth';
import { ManagerLoginRequest } from '../types';
import { Activity, Report, Game, Station, Mission } from '../models';
import { broadcastLock } from '../utils/lockBroadcaster';
import { closeOrderSurveyVoting, getOrderSurveyLiveState } from '../utils/orderSurveySession';

const router = Router();

// Manager login (supports password or Google OAuth)
router.post('/login', async (req: Request<{}, {}, ManagerLoginRequest>, res: Response) => {
  const { activityCode, email, password, googleAccessToken } = req.body;

  if (!activityCode) {
    res.status(400).json({ error: 'Activity code is required' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  if (!activity.managerEmail) {
    res.status(401).json({ error: 'No manager configured for this activity' });
    return;
  }

  // Determine the email being authenticated
  let resolvedEmail: string | undefined;

  if (googleAccessToken) {
    // Google flow: fetch email from Google and verify it matches the manager's email
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!profileRes.ok) {
        res.status(401).json({ error: 'Invalid Google token' });
        return;
      }
      const profile = await profileRes.json() as { email?: string };
      if (!profile.email) {
        res.status(401).json({ error: 'No email in Google profile' });
        return;
      }
      resolvedEmail = profile.email;
    } catch {
      res.status(401).json({ error: 'Failed to verify Google token' });
      return;
    }
  } else {
    // Password flow: requires email + password
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (!activity.managerPassword) {
      res.status(401).json({ error: 'Password login not enabled for this activity' });
      return;
    }
    const valid = await bcrypt.compare(password, activity.managerPassword);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    resolvedEmail = email;
  }

  if (!resolvedEmail || resolvedEmail.trim().toLowerCase() !== activity.managerEmail.toLowerCase()) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    {
      email: activity.managerEmail,
      activityCode: activity.code,
      activityId: activity._id.toString(),
      role: 'manager' as const,
    },
    JWT_SECRET,
    { expiresIn: '4h' }
  );

  res.json({
    token,
    manager: {
      email: activity.managerEmail,
      activityCode: activity.code,
      activityName: activity.name,
    },
  });
});

// Get reports for managed activity
router.get('/reports', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const reports = await Report.find(
    { activityCode },
    { participantName: 1, email: 1, phoneNumber: 1, group: 1, joinedAt: 1, 'data.scores': 1, 'data.totalScore': 1 },
  ).sort({ joinedAt: -1 }).lean();

  const participants = reports.map((r) => ({
    _id: r._id,
    participantName: r.participantName,
    email: r.email,
    phoneNumber: r.phoneNumber,
    group: r.group,
    joinedAt: r.joinedAt,
    scores: (r.data as unknown as Record<string, unknown>)?.scores || [],
    totalScore: (r.data as unknown as Record<string, unknown>)?.totalScore || 0,
  }));

  // Group standings (if group activity)
  let groupStandings: { name: string; totalScore: number; memberCount: number }[] = [];
  if (activity.connectionType === 'group' && activity.groups.length > 0) {
    const groupMap = new Map<string, { totalScore: number; memberCount: number }>();
    for (const g of activity.groups) {
      groupMap.set(g.name, { totalScore: 0, memberCount: 0 });
    }
    for (const p of participants) {
      if (p.group && groupMap.has(p.group)) {
        const entry = groupMap.get(p.group)!;
        entry.totalScore += Number(p.totalScore) || 0;
        entry.memberCount += 1;
      }
    }
    groupStandings = Array.from(groupMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  res.json({
    activityName: activity.name,
    connectionType: activity.connectionType,
    participants,
    groupStandings,
  });
});

// Manager: get module items (for the Control Flow tab) and current lock state.
router.get('/activity', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;

  const activity = await Activity.findOne({ code: activityCode }).lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const moduleItems = activity.module?.items || [];
  const gameIds: string[] = [];
  const stationIds: string[] = [];
  const missionIds: string[] = [];
  for (const item of moduleItems) {
    if (item.type === 'game') gameIds.push(item.ref.toString());
    else if (item.type === 'station') stationIds.push(item.ref.toString());
    else if (item.type === 'mission') missionIds.push(item.ref.toString());
  }

  const [games, stations, missions] = await Promise.all([
    gameIds.length ? Game.find({ _id: { $in: gameIds } }, { name: 1, type: 1, settings: 1 }).lean() : [],
    stationIds.length ? Station.find({ _id: { $in: stationIds } }, { name: 1, type: 1 }).lean() : [],
    missionIds.length ? Mission.find({ _id: { $in: missionIds } }, { name: 1 }).lean() : [],
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameMap = new Map(games.map((g: any) => [g._id.toString(), g]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stationMap = new Map(stations.map((s: any) => [s._id.toString(), s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missionMap = new Map(missions.map((m: any) => [m._id.toString(), m]));

  const items = moduleItems.map((item, index) => {
    let name = '';
    let subType: string | undefined;
    let orderMode: 'quiz' | 'survey' | undefined;
    let gameId: string | undefined;
    if (item.type === 'game') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = gameMap.get(item.ref.toString()) as any;
      name = g?.name || `Item ${index + 1}`;
      subType = g?.type;
      gameId = g?._id?.toString();
      if (g?.type === 'order') {
        const mode = g?.settings?.mode;
        orderMode = mode === 'survey' ? 'survey' : 'quiz';
      }
    } else if (item.type === 'station') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = stationMap.get(item.ref.toString()) as any;
      name = s?.name || `Item ${index + 1}`;
      subType = s?.type;
    } else if (item.type === 'mission') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = missionMap.get(item.ref.toString()) as any;
      name = m?.name || `Item ${index + 1}`;
    }
    return { index, type: item.type, name, subType, orderMode, gameId };
  });

  res.json({
    code: activity.code,
    name: activity.name,
    items,
    lockedFromIndex: typeof activity.lockedFromIndex === 'number' ? activity.lockedFromIndex : null,
    orderSurveySession: activity.orderSurveySession ?? null,
  });
});

// Order survey: live state for presenter screen
router.get('/order-survey/live', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;
  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const live = await getOrderSurveyLiveState(activity);
  res.json(live);
});

// Order survey: open voting for an item
router.post('/order-survey/start', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;
  const { itemIndex, roundIndex = 0, gameId } = req.body as {
    itemIndex?: number;
    roundIndex?: number;
    gameId?: string;
  };

  if (typeof itemIndex !== 'number' || !Number.isInteger(itemIndex) || itemIndex < 0) {
    res.status(400).json({ error: 'itemIndex is required' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const moduleItem = activity.module?.items?.[itemIndex];
  if (!moduleItem || moduleItem.type !== 'game') {
    res.status(400).json({ error: 'Item is not a game' });
    return;
  }

  activity.orderSurveySession = {
    itemIndex,
    gameId: gameId || moduleItem.ref.toString(),
    roundIndex: typeof roundIndex === 'number' ? roundIndex : 0,
    phase: 'voting',
    resultsRevealed: false,
    aggregatedRanking: undefined,
    updatedAt: new Date(),
  };
  activity.markModified('orderSurveySession');
  await activity.save();

  const live = await getOrderSurveyLiveState(activity);
  res.json(live);
});

// Order survey: close voting and compute Borda results
router.post('/order-survey/close', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;
  const aggregatedRanking = await closeOrderSurveyVoting(activityCode);
  if (aggregatedRanking === null) {
    res.status(400).json({ error: 'No active survey session' });
    return;
  }
  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const live = await getOrderSurveyLiveState(activity);
  res.json({ aggregatedRanking, live });
});

// Order survey: reveal results to participants (enables Continue on phones)
router.post('/order-survey/reveal', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;
  const activity = await Activity.findOne({ code: activityCode });
  if (!activity?.orderSurveySession) {
    res.status(400).json({ error: 'No active survey session' });
    return;
  }
  if (activity.orderSurveySession.phase !== 'results') {
    res.status(400).json({ error: 'Close voting before revealing results' });
    return;
  }
  activity.orderSurveySession.resultsRevealed = true;
  activity.orderSurveySession.updatedAt = new Date();
  activity.markModified('orderSurveySession');
  await activity.save();
  const live = await getOrderSurveyLiveState(activity);
  res.json(live);
});

// Manager: set the lock-from index. Pass `null` to unlock everything.
router.post('/lock', authenticateManager, async (req: Request, res: Response) => {
  const { activityCode } = req.manager!;
  const { lockedFromIndex } = req.body as { lockedFromIndex: number | null };

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const itemCount = activity.module?.items.length ?? 0;

  let next: number | null;
  if (lockedFromIndex === null) {
    next = null;
  } else if (typeof lockedFromIndex === 'number' && Number.isInteger(lockedFromIndex)
    && lockedFromIndex >= 0 && lockedFromIndex <= itemCount) {
    next = lockedFromIndex;
  } else {
    res.status(400).json({ error: 'Invalid lockedFromIndex' });
    return;
  }

  activity.lockedFromIndex = next;
  await activity.save();

  // Push to all connected participants for this activity.
  broadcastLock(activity.code, next);

  res.json({ lockedFromIndex: next });
});

export default router;
