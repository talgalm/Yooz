import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';
import { authenticateAdmin } from '../middleware/adminAuth';
import { AdminLoginRequest, AdminLoginResponse, CreateActivityRequest, LoginField } from '../types';
import { Activity, Report, Game, Station, Mission, AdminAuditLog, User } from '../models';

const router = Router();

// ─── Audit log helper ───

export function logAdminAction(
  req: Request,
  action: string,
  targetType?: string,
  targetId?: string,
  targetName?: string,
  details?: Record<string, unknown>,
) {
  const adminEmail = (req as unknown as { admin?: { email?: string } }).admin?.email || 'unknown';
  AdminAuditLog.create({
    adminEmail,
    action,
    targetType,
    targetId,
    targetName,
    details,
    ip: req.ip || req.socket?.remoteAddress,
  }).catch(() => { /* fire & forget */ });
}

const VALID_LOGIN_FIELDS: LoginField[] = ['email', 'phoneNumber', 'name'];

// --- Shared validation helpers ---

function validateActivityPayload(body: CreateActivityRequest): string | null {
  const { name, loginFields, connectionType } = body;
  if (!name || !loginFields || !connectionType) return 'Name, login fields, and connection type are required';
  if (name.length < 2 || name.length > 100) return 'Name must be between 2 and 100 characters';
  if (!Array.isArray(loginFields) || loginFields.length === 0) return 'At least one login field is required';
  if (!loginFields.every((f) => VALID_LOGIN_FIELDS.includes(f as LoginField))) return 'Invalid login field. Valid: email, phoneNumber, name';
  if (!['single', 'group'].includes(connectionType)) return 'Connection type must be "single" or "group"';
  return null;
}

async function buildActivityData(body: CreateActivityRequest, existingPasswordHash?: string): Promise<Record<string, unknown>> {
  const { name, loginFields, emailGoogle, connectionType, groups, opening, module: moduleConfig, questionMode, ageRanges, managerEmail, managerPassword, guidelines, customInstructions, scheduledStart, scheduledEnd } = body;
  const data: Record<string, unknown> = {
    name: name.trim(),
    loginFields,
    connectionType,
  };
  // Only store emailGoogle if email is in loginFields and it's true
  if (emailGoogle && loginFields.includes('email')) {
    data.emailGoogle = true;
  } else {
    data.emailGoogle = undefined;
  }
  // Handle groups
  if (connectionType === 'group') {
    if (groups && Array.isArray(groups) && groups.length > 0) {
      data.groups = groups.map((g, i) => ({
        name: (g.name || '').trim() || `Group ${i + 1}`,
      }));
    } else {
      data.groups = [{ name: 'Group 1' }, { name: 'Group 2' }];
    }
  } else {
    data.groups = [];
  }
  // Handle opening (optional splash screen)
  if (opening && opening.url && opening.url.trim() && ['video', 'image'].includes(opening.type)) {
    data.opening = { type: opening.type, url: opening.url.trim() };
  } else {
    data.opening = undefined;
  }
  // Handle module config
  if (moduleConfig) {
    if (moduleConfig.type === 'mission') {
      // Legacy mission module: just store the type and mission reference
      data.module = {
        type: 'mission',
        missionRef: moduleConfig.missionRef || undefined,
        items: [],
        popups: [],
      };
    } else {
      // Story module: supports games, stations, and missions as items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = moduleConfig as any;
      data.module = {
        type: moduleConfig.type || 'story',
        backgroundImage: moduleConfig.backgroundImage || undefined,
        items: Array.isArray(mod.items)
          ? mod.items
              .filter((item: { type: string; ref: string }) => item.type && item.ref && ['game', 'station', 'mission'].includes(item.type))
              .map((item: { type: string; ref: string }) => ({
                type: item.type,
                ref: item.ref,
              }))
          : [],
        popups: Array.isArray(mod.popups) ? mod.popups.map((p: Record<string, unknown>) => {
          const ct = p.contentType === 'image' ? 'image' : 'text';
          return {
            title: (p.title as string || '').trim(),
            contentType: ct,
            text: ct === 'text' ? (p.text as string || '').trim() : undefined,
            image: ct === 'image' ? (p.image as string || '').trim() : undefined,
            trigger: p.trigger || { point: 'afterLogin' },
            condition: p.condition || undefined,
            enabled: p.enabled !== false,
          };
        }).filter((p: { title: string; contentType: string; text?: string; image?: string }) => p.title && (p.contentType === 'image' ? !!p.image : !!p.text)) : [],
      };
    }
  }
  // Handle scheduling
  data.scheduledStart = scheduledStart ? new Date(scheduledStart) : undefined;
  data.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : undefined;

  // Handle guidelines
  data.guidelines = guidelines?.trim() || undefined;

  // Handle custom instructions
  if (customInstructions && typeof customInstructions === 'object') {
    const ci: Record<string, unknown> = {};
    if (customInstructions.title?.trim()) ci.title = customInstructions.title.trim();
    if (customInstructions.missionTitle?.trim()) ci.missionTitle = customInstructions.missionTitle.trim();
    if (Array.isArray(customInstructions.missionItems) && customInstructions.missionItems.length > 0) {
      ci.missionItems = customInstructions.missionItems.map((s: string) => (s || '').trim()).filter(Boolean);
    }
    if (customInstructions.guidelinesTitle?.trim()) ci.guidelinesTitle = customInstructions.guidelinesTitle.trim();
    if (Array.isArray(customInstructions.guidelineItems) && customInstructions.guidelineItems.length > 0) {
      ci.guidelineItems = customInstructions.guidelineItems.map((s: string) => (s || '').trim()).filter(Boolean);
    }
    if (customInstructions.buttonText?.trim()) ci.buttonText = customInstructions.buttonText.trim();
    data.customInstructions = Object.keys(ci).length > 0 ? ci : undefined;
  } else {
    data.customInstructions = undefined;
  }

  // Handle question mode & age ranges
  data.questionMode = questionMode || 'same';
  if (questionMode === 'byAge' && ageRanges && Array.isArray(ageRanges) && ageRanges.length > 0) {
    data.ageRanges = ageRanges.map((r) => ({
      label: (r.label || '').trim(),
      minAge: Number(r.minAge) || 0,
      maxAge: Number(r.maxAge) || 120,
    }));
  } else {
    data.ageRanges = [];
  }

  // Handle manager credentials
  if (managerEmail && managerEmail.trim()) {
    data.managerEmail = managerEmail.trim();
    if (managerPassword) {
      data.managerPassword = await bcrypt.hash(managerPassword, 10);
    } else if (existingPasswordHash) {
      data.managerPassword = existingPasswordHash;
    }
  } else {
    data.managerEmail = undefined;
    data.managerPassword = undefined;
  }
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripManagerPassword(activity: any) {
  if (!activity) return activity;
  const obj = typeof activity.toObject === 'function' ? activity.toObject() : { ...activity };
  delete obj.managerPassword;
  return obj;
}

// Helper: populate module items (games, stations, and missions) for activities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function populateActivityItems(activities: any[]): Promise<any[]> {
  const gameIds = new Set<string>();
  const stationIds = new Set<string>();
  const missionIds = new Set<string>();

  for (const a of activities) {
    const items = a.module?.items || [];
    for (const item of items) {
      if (item.type === 'game') gameIds.add(item.ref.toString());
      else if (item.type === 'station') stationIds.add(item.ref.toString());
      else if (item.type === 'mission') missionIds.add(item.ref.toString());
    }
  }

  const [games, stations, missions] = await Promise.all([
    gameIds.size > 0 ? Game.find({ _id: { $in: [...gameIds] } }).lean() : [],
    stationIds.size > 0 ? Station.find({ _id: { $in: [...stationIds] } }).lean() : [],
    missionIds.size > 0 ? Mission.find({ _id: { $in: [...missionIds] } }).lean() : [],
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameMap = new Map(games.map((g: any) => [g._id.toString(), g]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stationMap = new Map(stations.map((s: any) => [s._id.toString(), s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missionMap = new Map(missions.map((m: any) => [m._id.toString(), m]));

  return activities.map((a) => {
    const obj = typeof a.toObject === 'function' ? a.toObject() : { ...a };
    if (obj.module?.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      obj.module.items = obj.module.items.map((item: any) => {
        let data;
        if (item.type === 'game') data = gameMap.get(item.ref.toString());
        else if (item.type === 'station') data = stationMap.get(item.ref.toString());
        else if (item.type === 'mission') data = missionMap.get(item.ref.toString());
        return { type: item.type, ref: item.ref, data };
      });
    }
    return obj;
  });
}

// Admin login (email + password)
router.post('/login', async (req: Request<{}, {}, AdminLoginRequest>, res: Response<AdminLoginResponse | { error: string }>) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { email: user.email, role: user.role, userId: user._id.toString() },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  logAdminAction(req, 'login');
  res.json({ token, admin: { email: user.email, role: user.role, name: user.name } });
});

// Admin login (Google OAuth)
router.post('/login/google', async (req: Request, res: Response) => {
  const { googleToken } = req.body;
  if (!googleToken) {
    res.status(400).json({ error: 'Google token is required' });
    return;
  }

  const googleRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${googleToken}` },
  });
  if (!googleRes.ok) {
    res.status(401).json({ error: 'Invalid Google token' });
    return;
  }

  const profile = await googleRes.json() as { email?: string; id?: string };
  if (!profile.email) {
    res.status(401).json({ error: 'No email from Google' });
    return;
  }

  const user = await User.findOne({ email: profile.email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: 'No account found for this email. Contact your admin.' });
    return;
  }

  if (!user.googleId && profile.id) {
    user.googleId = profile.id;
    await user.save();
  }

  const token = jwt.sign(
    { email: user.email, role: user.role, userId: user._id.toString() },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  logAdminAction(req, 'login_google');
  res.json({ token, admin: { email: user.email, role: user.role, name: user.name } });
});

// List all activities (with populated items)
router.get('/activities', authenticateAdmin, async (_req: Request, res: Response) => {
  const activities = await Activity.find().sort({ createdAt: -1 }).lean();
  const populated = await populateActivityItems(activities);
  res.json({ activities: populated.map((a) => stripManagerPassword(a)) });
});

// Create activity
router.post('/activities', authenticateAdmin, async (req: Request<{}, {}, CreateActivityRequest>, res: Response) => {
  const error = validateActivityPayload(req.body);
  if (error) { res.status(400).json({ error }); return; }

  const activityData = await buildActivityData(req.body);
  const activity = await Activity.create(activityData);
  logAdminAction(req, 'create_activity', 'activity', activity._id.toString(), activity.name);
  res.status(201).json({ activity: stripManagerPassword(activity) });
});

// Update activity (code is NOT editable)
router.put('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateActivityRequest>, res: Response) => {
  const error = validateActivityPayload(req.body);
  if (error) { res.status(400).json({ error }); return; }

  const existing = await Activity.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }

  const activityData = await buildActivityData(req.body, existing.managerPassword);
  const activity = await Activity.findByIdAndUpdate(req.params.id, { $set: activityData }, { new: true, runValidators: true });
  logAdminAction(req, 'update_activity', 'activity', req.params.id, req.body.name);
  res.json({ activity: activity ? stripManagerPassword(activity) : activity });
});

// Get single activity (with populated items)
router.get('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const activity = await Activity.findById(req.params.id).lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const [populated] = await populateActivityItems([activity]);
  res.json({ activity: stripManagerPassword(populated) });
});

// Toggle activity status (preview <-> live)
router.patch('/activities/:id/status', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const { status } = req.body;
  if (!status || !['preview', 'live'].includes(status)) {
    res.status(400).json({ error: 'Status must be "preview" or "live"' });
    return;
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  // When going live, wipe all dynamic data (reports/participants/scores)
  if (status === 'live') {
    await Report.deleteMany({ activityId: activity._id });
  }

  activity.status = status;
  await activity.save();
  logAdminAction(req, 'toggle_status', 'activity', req.params.id, activity.name, { status });
  res.json({ activity: stripManagerPassword(activity) });
});

// Delete activity
router.delete('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const activity = await Activity.findByIdAndDelete(req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  // Cascade-delete all reports linked to this activity
  await Report.deleteMany({ activityId: activity._id });
  logAdminAction(req, 'delete_activity', 'activity', req.params.id, activity.name);
  res.json({ success: true });
});

// Search games and stations by name (for activity creation)
router.get('/search', authenticateAdmin, async (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').trim();
  const filter = (req.query.filter as string) || 'both';
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  if (!q || q.length < 1) {
    res.json({ games: [], stations: [] });
    return;
  }

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: { games: any[]; stations: any[] } = { games: [], stations: [] };

  if (filter !== 'stations') {
    results.games = await Game.find({ name: regex }).limit(limit).sort({ name: 1 }).lean();
  }
  if (filter !== 'games') {
    results.stations = await Station.find({ name: regex }).limit(limit).sort({ name: 1 }).lean();
  }

  res.json(results);
});

// Return random games and stations for quick activity creation
router.get('/random-items', authenticateAdmin, async (req: Request, res: Response) => {
  const gameCount = Math.min(Number(req.query.games) || 4, 20);
  const stationCount = Math.min(Number(req.query.stations) || 2, 20);

  const [games, stations] = await Promise.all([
    Game.aggregate([{ $sample: { size: gameCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
    Station.aggregate([{ $sample: { size: stationCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
  ]);

  // Interleave: station, games, station, games...
  const items: { itemType: 'game' | 'station'; _id: string; name: string; subType: string }[] = [];
  let gi = 0;
  let si = 0;
  const gamesPerChunk = Math.max(1, Math.ceil(games.length / Math.max(stations.length, 1)));

  while (gi < games.length || si < stations.length) {
    if (si < stations.length) {
      items.push({ itemType: 'station', _id: stations[si]._id.toString(), name: stations[si].name, subType: stations[si].type });
      si++;
    }
    for (let k = 0; k < gamesPerChunk && gi < games.length; k++) {
      items.push({ itemType: 'game', _id: games[gi]._id.toString(), name: games[gi].name, subType: games[gi].type });
      gi++;
    }
  }

  res.json({ items });
});

export default router;
