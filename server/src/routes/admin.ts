import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import {
  assertModuleOwnedByCustomer,
  createdByEmailForNewResource,
  customerMongoFilter,
  customerOwnsDoc,
  isCustomerRole,
} from '../middleware/customerScope';
import { AdminLoginRequest, AdminLoginResponse, CreateActivityRequest, LoginField } from '../types';
import { Activity, ActivityFolder, Report, Game, Station, Mission, AdminAuditLog, User } from '../models';
import { clampPassThreshold } from '../utils/scoreNormalization';
import { resolveGroupRewardForSave } from '../utils/groupRewardConfig';
import { IActivity } from '../models/Activity';
import { provisionManagerCustomer, type ManagerProvisionResult } from '../utils/provisionManagerCustomer';
import { getSmsProvider } from '../services/sms/smsProvider';
import { renderWinnerSms } from '../utils/groupRewardConfig';
import { DEFAULT_SMS_TEMPLATE } from '../services/groupRewardService';

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

function validateActivityPayload(body: CreateActivityRequest, options?: { isCreate?: boolean }): string | null {
  const { name, loginFields, connectionType, managerEmail, managerPassword } = body;
  if (!name || !loginFields || !connectionType) return 'Name, login fields, and connection type are required';
  if (name.length < 2 || name.length > 100) return 'Name must be between 2 and 100 characters';
  if (!Array.isArray(loginFields) || loginFields.length === 0) return 'At least one login field is required';
  if (!loginFields.every((f) => VALID_LOGIN_FIELDS.includes(f as LoginField))) return 'Invalid login field. Valid: email, phoneNumber, name';
  if (!['single', 'group'].includes(connectionType)) return 'Connection type must be "single" or "group"';
  if (options?.isCreate && managerEmail?.trim() && !managerPassword) {
    return 'Manager password is required when assigning a manager';
  }
  return null;
}

async function provisionActivityManager(
  managerEmail: string | undefined,
  managerPassword: string | undefined,
): Promise<ManagerProvisionResult | undefined> {
  if (!managerEmail?.trim()) return undefined;
  return provisionManagerCustomer(managerEmail.trim(), managerPassword);
}

async function buildActivityData(
  body: CreateActivityRequest,
  existingPasswordHash?: string,
  existing?: IActivity,
): Promise<Record<string, unknown>> {
  const { name, loginFields, emailGoogle, connectionType, groupEntryMode, groupMinMembers, groupMaxMembers, groupReward, smsForCollage, smsForCollageMessage, smsForCollageShare, groups, opening, module: moduleConfig, managerEmail, managerPassword, guidelines, customInstructions, scheduledStart, scheduledEnd, isContinuous, portalId, leaderboardMode, leaderboardAsGrade, hideLeaderboardInHeader, leaderboardCurrentDayOnly, activityDurationMinutes, roadmapTimerMinutes, includeOnRoadmap, passThreshold } = body;
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
    const mode = groupEntryMode || 'preset';
    data.groupEntryMode = mode;
    if (mode === 'selfService') {
      data.groups = [];
      data.groupMinMembers = Math.max(1, groupMinMembers ?? 1);
      data.groupMaxMembers = groupMaxMembers && groupMaxMembers > 0 ? groupMaxMembers : null;
      data.groupReward = resolveGroupRewardForSave(groupReward, existing?.groupReward);
    } else if (groups && Array.isArray(groups) && groups.length > 0) {
      data.groups = groups.map((g, i) => ({
        name: (g.name || '').trim() || `Group ${i + 1}`,
      }));
    } else {
      data.groups = [{ name: 'Group 1' }, { name: 'Group 2' }];
    }
  } else {
    data.groups = [];
    data.groupEntryMode = undefined;
    data.groupMinMembers = undefined;
    data.groupMaxMembers = undefined;
    data.groupReward = undefined;
  }
  // Handle opening (optional splash screen); null explicitly clears on update
  if (opening === null) {
    data.opening = null;
  } else if (opening && opening.url && opening.url.trim() && ['video', 'image'].includes(opening.type)) {
    data.opening = { type: opening.type, url: opening.url.trim() };
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
        theme: mod.theme || undefined,
        backgroundImage: moduleConfig.backgroundImage || undefined,
        ...(mod.showStationNumbers === true && { showStationNumbers: true }),
        ...(mod.showItemTitleNumbers === true && { showItemTitleNumbers: true }),
        items: Array.isArray(mod.items)
          ? mod.items
              .filter((item: { type: string; ref: string }) => item.type && item.ref && ['game', 'station', 'mission'].includes(item.type))
              .map((item: {
                type: string;
                ref: string;
                groups?: string[];
                spiderSvg?: string;
                isFinal?: boolean;
                revisitable?: boolean;
                collageSplit?: { splitGroupId: string; partIndex: number; partSizes?: number[]; totalParts?: number; videoPartIndex?: number | null; photoOrder?: number[] };
              }) => ({
                type: item.type,
                ref: item.ref,
                ...(Array.isArray(item.groups) && item.groups.length > 0 && { groups: item.groups }),
                ...(item.spiderSvg && { spiderSvg: item.spiderSvg }),
                ...(item.isFinal && { isFinal: true }),
                ...(item.revisitable && { revisitable: true }),
                ...(item.collageSplit && { collageSplit: item.collageSplit }),
              }))
          : [],
        popups: Array.isArray(mod.popups) ? mod.popups.map((p: Record<string, unknown>) => {
          const ct = p.contentType === 'image' ? 'image' : 'text';
          return {
            title: (p.title as string || '').trim(),
            contentType: ct,
            text: ct === 'text' ? (p.text as string || '').trim() : undefined,
            image: ct === 'image' ? (p.image as string || '').trim() : undefined,
            includeUsername: p.includeUsername === true,
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

  // Handle leaderboard mode
  data.leaderboardMode = leaderboardMode === 'time'
    ? 'time'
    : leaderboardMode === 'both'
      ? 'both'
      : 'points';
  data.leaderboardAsGrade = leaderboardAsGrade === true;
  data.hideLeaderboardInHeader = hideLeaderboardInHeader === true;
  data.leaderboardCurrentDayOnly = leaderboardCurrentDayOnly !== false;
  // Time limit is only meaningful in modes that show the timer (time/both).
  data.activityDurationMinutes = ((data.leaderboardMode === 'time' || data.leaderboardMode === 'both') && activityDurationMinutes && activityDurationMinutes > 0)
    ? activityDurationMinutes
    : undefined;

  // Cosmetic roadmap count-up timer (independent of leaderboard mode).
  // null (not undefined) so disabling it actually clears the stored value on edit.
  data.roadmapTimerMinutes = (roadmapTimerMinutes && roadmapTimerMinutes > 0)
    ? Math.round(roadmapTimerMinutes)
    : null;

  // Handle continuous activity
  data.isContinuous = isContinuous === true;
  data.portalId = isContinuous && portalId ? portalId : undefined;

  data.includeOnRoadmap = includeOnRoadmap === true;

  data.smsForCollage = smsForCollage === true && Array.isArray(loginFields) && loginFields.includes('phoneNumber');
  data.smsForCollageMessage = data.smsForCollage && smsForCollageMessage?.trim() ? smsForCollageMessage.trim() : undefined;
  data.smsForCollageShare = data.smsForCollage && smsForCollageShare === true;

  // Pass grade (normalized 0-100, or null for no pass grade). Only written when
  // present in the payload so a regular activity save from the editor (which
  // doesn't send it) preserves the existing value rather than resetting it.
  if (passThreshold !== undefined) {
    data.passThreshold = passThreshold === null ? null : clampPassThreshold(passThreshold);
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
  obj.managerHasPassword = !!obj.managerPassword;
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
        return {
          type: item.type,
          ref: item.ref,
          data,
          groups: item.groups,
          spiderSvg: item.spiderSvg,
          isFinal: item.isFinal,
          revisitable: item.revisitable,
          collageSplit: item.collageSplit,
        };
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
    { expiresIn: '7d' },
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
    { expiresIn: '7d' },
  );

  logAdminAction(req, 'login_google');
  res.json({ token, admin: { email: user.email, role: user.role, name: user.name } });
});

// List all activities (with populated items)
router.get('/activities', authenticateAdmin, async (req: Request, res: Response) => {
  const activities = await Activity.find(customerMongoFilter(req)).sort({ createdAt: -1 }).lean();
  const populated = await populateActivityItems(activities);
  res.json({ activities: populated.map((a) => stripManagerPassword(a)) });
});

// Create activity
router.post('/activities', authenticateAdmin, async (req: Request<{}, {}, CreateActivityRequest>, res: Response) => {
  const error = validateActivityPayload(req.body, { isCreate: true });
  if (error) { res.status(400).json({ error }); return; }

  const moduleErr = await assertModuleOwnedByCustomer(req, req.body.module);
  if (moduleErr) { res.status(403).json({ error: moduleErr }); return; }

  const activityData = await buildActivityData(req.body);
  if (activityData.opening === null) delete activityData.opening;
  const activity = await Activity.create({
    ...activityData,
    createdByEmail: createdByEmailForNewResource(req),
  });
  const managerProvision = await provisionActivityManager(req.body.managerEmail, req.body.managerPassword);
  logAdminAction(req, 'create_activity', 'activity', activity._id.toString(), activity.name);
  res.status(201).json({ activity: stripManagerPassword(activity), managerProvision });
});

// Update activity (code is NOT editable)
router.put('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateActivityRequest>, res: Response) => {
  const error = validateActivityPayload(req.body);
  if (error) { res.status(400).json({ error }); return; }

  const existing = await Activity.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Activity not found' }); return; }
  if (isCustomerRole(req) && existing.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }

  const moduleErr = await assertModuleOwnedByCustomer(req, req.body.module, existing);
  if (moduleErr) { res.status(403).json({ error: moduleErr }); return; }

  const activityData = await buildActivityData(req.body, existing.managerPassword, existing);
  const unset: Record<string, 1> = {};
  if (activityData.opening === null) {
    unset.opening = 1;
    delete activityData.opening;
  }
  const activity = await Activity.findByIdAndUpdate(
    req.params.id,
    { $set: activityData, ...(Object.keys(unset).length > 0 && { $unset: unset }) },
    { new: true, runValidators: true },
  );
  const managerProvision = await provisionActivityManager(req.body.managerEmail, req.body.managerPassword);
  logAdminAction(req, 'update_activity', 'activity', req.params.id, req.body.name);
  res.json({ activity: activity ? stripManagerPassword(activity) : activity, managerProvision });
});

// Get single activity (with populated items)
router.get('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const activity = await Activity.findById(req.params.id).lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (!customerOwnsDoc(req, activity)) {
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
  if (!customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && activity.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }

  // When going live, wipe all dynamic data (reports/participants/scores/session state)
  if (status === 'live') {
    await Report.deleteMany({ activityId: activity._id });
    activity.orderSurveySession = undefined;
    activity.shareClicks = undefined;
    activity.shareCompleted = undefined;
    activity.missionPuzzleCompletions = undefined;
    activity.missionTrashSortCompletions = undefined;
    activity.missionTrashSortScoreSum = undefined;
  }

  activity.status = status;
  await activity.save();
  logAdminAction(req, 'toggle_status', 'activity', req.params.id, activity.name, { status });
  res.json({ activity: stripManagerPassword(activity) });
});

// Move an activity into a folder, or out to the ungrouped root (folderId: null).
// Filing is organizational (not a content edit), so this is intentionally allowed even
// when the activity is customerEditLocked — unlike the status/PUT endpoints.
router.patch('/activities/:id/folder', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const { folderId } = req.body as { folderId?: unknown };
  if (folderId !== null && typeof folderId !== 'string') {
    res.status(400).json({ error: 'folderId must be a string or null' });
    return;
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  if (folderId) {
    const folder = await ActivityFolder.findById(folderId);
    if (!folder || !customerOwnsDoc(req, folder)) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    activity.folderId = folder._id;
  } else {
    activity.folderId = null;
  }

  await activity.save();
  logAdminAction(req, 'move_activity_folder', 'activity', activity._id.toString(), activity.name, {
    folderId: folderId || null,
  });
  res.json({ activity: stripManagerPassword(activity) });
});

// Duplicate activity — creates a clone with " (עותק)" suffix and a fresh code
router.post('/activities/:id/duplicate', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Activity.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Activity not found' }); return; }

  const source = existing.toObject() as unknown as Record<string, unknown>;
  // Strip identifiers / generated fields so the new doc gets fresh values
  delete source._id;
  delete source.code;
  delete source.createdAt;
  delete source.__v;
  // Reset usage counters and start in preview
  delete source.shareClicks;
  delete source.shareCompleted;
  delete source.missionPuzzleCompletions;
  delete source.missionTrashSortCompletions;
  delete source.missionTrashSortScoreSum;

  const activity = await Activity.create({
    ...source,
    name: `${existing.name} (עותק)`,
    status: 'preview',
    createdByEmail: createdByEmailForNewResource(req),
    customerEditLocked: false,
  });
  logAdminAction(req, 'duplicate_activity', 'activity', activity._id.toString(), activity.name, { sourceId: existing._id.toString() });
  res.status(201).json({ activity: stripManagerPassword(activity) });
});

// Delete activity
router.delete('/activities/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Activity.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (!customerOwnsDoc(req, existing)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (isCustomerRole(req) && existing.customerEditLocked) {
    res.status(403).json({ error: 'Activity is locked for customer edits' });
    return;
  }
  await Activity.findByIdAndDelete(req.params.id);
  // Cascade-delete all reports linked to this activity
  await Report.deleteMany({ activityId: existing._id });
  logAdminAction(req, 'delete_activity', 'activity', req.params.id, existing.name);
  res.json({ success: true });
});

// Lock/unlock customer edits on an activity (admin/super_admin only)
router.patch(
  '/activities/:id/customer-lock',
  authenticateAdmin,
  requireRole('admin', 'super_admin'),
  async (req: Request<{ id: string }>, res: Response) => {
    const { locked } = req.body as { locked?: unknown };
    if (typeof locked !== 'boolean') {
      res.status(400).json({ error: 'locked must be a boolean' });
      return;
    }

    const existing = await Activity.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    existing.customerEditLocked = locked;
    await existing.save();
    logAdminAction(
      req,
      locked ? 'lock_customer_activity_edits' : 'unlock_customer_activity_edits',
      'activity',
      existing._id.toString(),
      existing.name,
      { customerEditLocked: locked },
    );
    res.json({ activity: stripManagerPassword(existing) });
  }
);

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
  const tag = (req.query.tag as string) || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: { games: any[]; stations: any[] } = { games: [], stations: [] };

  // Build query: search name, description, tags, and question content
  const buildQuery = (extraFields: Record<string, unknown>[] = []) => {
    const orConditions = [
      { name: regex },
      { description: regex },
      { tags: regex },
      { customer: regex },
      ...extraFields,
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { $or: orConditions };
    if (tag) query.tags = tag;
    return query;
  };

  const scope = customerMongoFilter(req);
  const withScope = (base: Record<string, unknown>) =>
    (Object.keys(scope).length > 0 ? { $and: [base, scope] } : base);

  if (filter !== 'stations') {
    results.games = await Game.find(
      withScope(buildQuery([{ 'settings.questions.text': regex }]))
    ).limit(limit).sort({ name: 1 }).lean();
  }
  if (filter !== 'games') {
    results.stations = await Station.find(
      withScope(buildQuery())
    ).limit(limit).sort({ name: 1 }).lean();
  }

  res.json(results);
});

// Return random games and stations for quick activity creation
router.get('/random-items', authenticateAdmin, async (req: Request, res: Response) => {
  const gameCount = Math.min(Number(req.query.games) || 4, 20);
  const stationCount = Math.min(Number(req.query.stations) || 2, 20);

  const scope = customerMongoFilter(req);
  const matchStage = Object.keys(scope).length > 0 ? [{ $match: scope }] : [];

  const [games, stations] = await Promise.all([
    Game.aggregate([...matchStage, { $sample: { size: gameCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
    Station.aggregate([...matchStage, { $sample: { size: stationCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
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

// Send a test SMS using the currently-configured provider — used by the
// admin "test SMS" button on the activity creation page.
router.post('/sms/test', authenticateAdmin, async (req: Request<{}, {}, { phoneNumber?: string; message?: string; attachmentUrl?: string; couponCode?: string }>, res: Response) => {
  const phone = (req.body.phoneNumber || '').trim();
  const template = (req.body.message || '').trim() || DEFAULT_SMS_TEMPLATE;
  if (!phone) return res.status(400).json({ error: 'phoneNumber is required' });

  // ponytail: test SMS routes through the same /api/reward-download/:token proxy as the real winner link, using a self-contained test_<base64url(url)> token (no DB write needed pre-save).
  const attachmentUrl = (req.body.attachmentUrl || '').trim();
  const siteBase = (process.env.APP_URL || process.env.SITE_URL)?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
  const link = attachmentUrl
    ? `${siteBase}/api/reward-download/test_${Buffer.from(attachmentUrl, 'utf8').toString('base64url')}`
    : '';
  const message = renderWinnerSms(template, {
    name: 'בדיקה',
    score: 100,
    coupon: (req.body.couponCode || '').trim() || 'TEST123',
    group: 'קבוצת בדיקה',
    link,
  });

  const provider = getSmsProvider();
  const result = await provider.send(phone, message);
  if (!result.success) {
    return res.status(502).json({ error: result.error || 'SMS send failed', provider: provider.name });
  }
  res.json({ ok: true, provider: provider.name, providerMessageId: result.providerMessageId });
});

export default router;
