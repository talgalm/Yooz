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
import { Activity, ActivityFolder, ActivityGroup, Report, Game, Station, Mission, AdminAuditLog, User } from '../models';
import { clampPassThreshold } from '../utils/scoreNormalization';
import { resolveGroupRewardForSave } from '../utils/groupRewardConfig';
import { sanitiseLanguages } from '../utils/requestLang';
import { sanitizeLocation, sanitizeProximityMeters, sanitizeGroupOrders } from '../utils/moduleItems';
import { pretranslateActivity } from '../services/activityPretranslate';
import { IActivity, IScheduledReport } from '../models/Activity';
import { provisionManagerCustomer, type ManagerProvisionResult } from '../utils/provisionManagerCustomer';
import { getSmsProvider } from '../services/sms/smsProvider';
import { renderWinnerSms } from '../utils/groupRewardConfig';
import { DEFAULT_SMS_TEMPLATE } from '../services/groupRewardService';
import { wipeActivityData } from '../services/activityReset';
import { type AnalyticsExportType } from '../utils/analyticsExcelExport';
import { sendScheduledReportNow } from '../services/scheduledReports';

const router = Router();

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
  }).catch(() => { });
}

const VALID_LOGIN_FIELDS: LoginField[] = ['email', 'phoneNumber', 'name'];

const VALID_HELP_CATEGORIES = ['login', 'game_start', 'score', 'loading', 'kicked_out', 'button_stuck', 'task_stuck', 'video_missing'];

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

function warmTranslations(activityId: string, languages?: string[]): void {
  if (!languages?.length) return;
  pretranslateActivity(activityId, languages).catch(() => undefined);
}

async function buildActivityData(
  body: CreateActivityRequest,
  existingPasswordHash?: string,
  existing?: IActivity,
): Promise<Record<string, unknown>> {
  const { name, loginFields, emailGoogle, connectionType, groupEntryMode, groupMinMembers, groupMaxMembers, groupReward, smsForCollage, smsForCollageMessage, smsForCollageShare, groups, opening, module: moduleConfig, managerEmail, managerPassword, userControl, guidelines, extraSupportInfo, organizerContactName, organizerContactPhone, helpCategoriesDisabled, helpCategoryResponses, helpOtherCategoryEnabled, customInstructions, languages, scheduledStart, scheduledEnd, isContinuous, portalId, leaderboardMode, leaderboardAsGrade, hideLeaderboardInHeader, leaderboardCurrentDayOnly, dailyReset, activityDurationMinutes, roadmapTimerMinutes, includeOnRoadmap, passThreshold } = body;
  const data: Record<string, unknown> = {
    name: name.trim(),
    loginFields,
    connectionType,
  };
  if (emailGoogle && loginFields.includes('email')) {
    data.emailGoogle = true;
  } else {
    data.emailGoogle = undefined;
  }
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
  if (opening === null) {
    data.opening = null;
  } else if (opening && opening.url && opening.url.trim() && ['video', 'image'].includes(opening.type)) {
    data.opening = { type: opening.type, url: opening.url.trim() };
  }
  if (moduleConfig) {
    if (moduleConfig.type === 'mission') {
      data.module = {
        type: 'mission',
        missionRef: moduleConfig.missionRef || undefined,
        items: [],
        popups: [],
      };
    } else {
      const mod = moduleConfig as any;
      const isMap = moduleConfig.type === 'map';
      const items = Array.isArray(mod.items)
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
              location?: unknown;
            }) => {
              const location = isMap ? sanitizeLocation(item.location) : undefined;
              return {
                type: item.type,
                ref: item.ref,
                ...(Array.isArray(item.groups) && item.groups.length > 0 && { groups: item.groups }),
                ...(item.spiderSvg && { spiderSvg: item.spiderSvg }),
                ...(item.isFinal && { isFinal: true }),
                ...(item.revisitable && { revisitable: true }),
                ...(item.collageSplit && { collageSplit: item.collageSplit }),
                ...(location && { location }),
              };
            })
        : [];
      const proximityMeters = isMap ? sanitizeProximityMeters(mod.proximityMeters) : undefined;
      const groupOrders = isMap ? sanitizeGroupOrders(mod.groupOrders, items.length) : undefined;
      data.module = {
        type: moduleConfig.type || 'story',
        theme: mod.theme || undefined,
        backgroundImage: moduleConfig.backgroundImage || undefined,
        ...(mod.showStationNumbers === true && { showStationNumbers: true }),
        ...(mod.showItemTitleNumbers === true && { showItemTitleNumbers: true }),
        ...(proximityMeters !== undefined && { proximityMeters }),
        ...(groupOrders && { groupOrders }),
        items,
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
  data.scheduledStart = scheduledStart ? new Date(scheduledStart) : undefined;
  data.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : undefined;

  data.guidelines = guidelines?.trim() || null;

  data.languages = sanitiseLanguages(languages);

  data.extraSupportInfo = extraSupportInfo?.trim().slice(0, 2000) || null;

  const contactName = organizerContactName?.trim();
  const contactPhone = organizerContactPhone?.trim();
  data.organizerContactName = contactName && contactPhone ? contactName.slice(0, 100) : null;
  data.organizerContactPhone = contactName && contactPhone ? contactPhone.slice(0, 30) : null;

  const disabledCategories = Array.isArray(helpCategoriesDisabled)
    ? helpCategoriesDisabled.filter((c): c is string => typeof c === 'string' && VALID_HELP_CATEGORIES.includes(c))
    : [];
  data.helpCategoriesDisabled = disabledCategories.length > 0 ? disabledCategories : null;

  const cleanedResponses: Record<string, string> = {};
  if (helpCategoryResponses && typeof helpCategoryResponses === 'object') {
    for (const [key, value] of Object.entries(helpCategoryResponses)) {
      if (VALID_HELP_CATEGORIES.includes(key) && typeof value === 'string' && value.trim()) {
        cleanedResponses[key] = value.trim().slice(0, 1000);
      }
    }
  }
  data.helpCategoryResponses = Object.keys(cleanedResponses).length > 0 ? cleanedResponses : null;

  data.helpOtherCategoryEnabled = helpOtherCategoryEnabled === true;

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

  data.leaderboardMode = leaderboardMode === 'time'
    ? 'time'
    : leaderboardMode === 'both'
      ? 'both'
      : 'points';
  data.leaderboardAsGrade = leaderboardAsGrade === true;
  data.hideLeaderboardInHeader = hideLeaderboardInHeader === true;
  data.leaderboardCurrentDayOnly = leaderboardCurrentDayOnly !== false;
  data.dailyReset = dailyReset === true;
  data.userControl = userControl === true;
  data.activityDurationMinutes = ((data.leaderboardMode === 'time' || data.leaderboardMode === 'both') && activityDurationMinutes && activityDurationMinutes > 0)
    ? activityDurationMinutes
    : undefined;

  data.roadmapTimerMinutes = (roadmapTimerMinutes && roadmapTimerMinutes > 0)
    ? Math.round(roadmapTimerMinutes)
    : null;

  data.isContinuous = isContinuous === true;
  data.portalId = isContinuous && portalId ? portalId : undefined;

  data.includeOnRoadmap = includeOnRoadmap === true;

  data.smsForCollage = smsForCollage === true && Array.isArray(loginFields) && loginFields.includes('phoneNumber');
  data.smsForCollageMessage = data.smsForCollage && smsForCollageMessage?.trim() ? smsForCollageMessage.trim() : undefined;
  data.smsForCollageShare = data.smsForCollage && smsForCollageShare === true;

  if (passThreshold !== undefined) {
    data.passThreshold = passThreshold === null ? null : clampPassThreshold(passThreshold);
  }

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

function stripManagerPassword(activity: any) {
  if (!activity) return activity;
  const obj = typeof activity.toObject === 'function' ? activity.toObject() : { ...activity };
  obj.managerHasPassword = !!obj.managerPassword;
  delete obj.managerPassword;
  return obj;
}

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

  const gameMap = new Map(games.map((g: any) => [g._id.toString(), g]));
  const stationMap = new Map(stations.map((s: any) => [s._id.toString(), s]));
  const missionMap = new Map(missions.map((m: any) => [m._id.toString(), m]));

  return activities.map((a) => {
    const obj = typeof a.toObject === 'function' ? a.toObject() : { ...a };
    if (obj.module?.items) {
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
          location: item.location,
        };
      });
    }
    return obj;
  });
}

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

router.get('/activities', authenticateAdmin, async (req: Request, res: Response) => {
  const activities = await Activity.find(customerMongoFilter(req)).sort({ createdAt: -1 }).lean();
  const populated = await populateActivityItems(activities);
  res.json({ activities: populated.map((a) => stripManagerPassword(a)) });
});

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
  warmTranslations(activity._id.toString(), activity.languages);
  logAdminAction(req, 'create_activity', 'activity', activity._id.toString(), activity.name);
  res.status(201).json({ activity: stripManagerPassword(activity), managerProvision });
});

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
  if (activity) warmTranslations(activity._id.toString(), activity.languages);
  logAdminAction(req, 'update_activity', 'activity', req.params.id, req.body.name);
  res.json({ activity: activity ? stripManagerPassword(activity) : activity, managerProvision });
});

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

  if (status === 'live') await wipeActivityData(activity);

  activity.status = status;
  await activity.save();
  logAdminAction(req, 'toggle_status', 'activity', req.params.id, activity.name, { status });
  res.json({ activity: stripManagerPassword(activity) });
});

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

const VALID_SCHEDULED_REPORT_TYPES: AnalyticsExportType[] = ['executive', 'participants', 'scores', 'progress'];
const SCHEDULED_REPORT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultScheduledReport(): IScheduledReport {
  return {
    enabled: false,
    reportType: 'executive',
    recipients: [],
    frequency: 'daily',
    scheduleHour: 8,
    skipIfUnchanged: false,
  };
}

router.get('/activities/:activityId/scheduled-report', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request<{ activityId: string }>, res: Response) => {
  const activity = await Activity.findById(req.params.activityId, { scheduledReport: 1 }).lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json({ scheduledReport: activity.scheduledReport || defaultScheduledReport() });
});

router.put('/activities/:activityId/scheduled-report', authenticateAdmin, requireRole('admin', 'super_admin'), async (
  req: Request<{ activityId: string }, {}, {
    enabled?: unknown;
    reportType?: unknown;
    recipients?: unknown;
    frequency?: unknown;
    dayOfWeek?: unknown;
    scheduleHour?: unknown;
    skipIfUnchanged?: unknown;
  }>,
  res: Response,
) => {
  const activity = await Activity.findById(req.params.activityId);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const { body } = req;
  if (typeof body.reportType !== 'string' || !VALID_SCHEDULED_REPORT_TYPES.includes(body.reportType as AnalyticsExportType)) {
    res.status(400).json({ error: `reportType must be one of: ${VALID_SCHEDULED_REPORT_TYPES.join(', ')}` });
    return;
  }
  const reportType = body.reportType as AnalyticsExportType;

  if (body.frequency !== 'daily' && body.frequency !== 'weekly') {
    res.status(400).json({ error: 'frequency must be "daily" or "weekly"' });
    return;
  }
  const frequency = body.frequency;

  let dayOfWeek: number | undefined;
  if (frequency === 'weekly') {
    if (typeof body.dayOfWeek !== 'number' || !Number.isInteger(body.dayOfWeek) || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
      res.status(400).json({ error: 'dayOfWeek (0-6) is required when frequency is "weekly"' });
      return;
    }
    dayOfWeek = body.dayOfWeek;
  }

  if (typeof body.scheduleHour !== 'number' || !Number.isInteger(body.scheduleHour) || body.scheduleHour < 0 || body.scheduleHour > 23) {
    res.status(400).json({ error: 'scheduleHour must be an integer between 0 and 23' });
    return;
  }
  const scheduleHour = body.scheduleHour;

  const recipients = Array.isArray(body.recipients)
    ? [...new Set(body.recipients.map((r) => String(r).trim().toLowerCase()).filter(Boolean))]
    : [];
  if (recipients.some((r) => !SCHEDULED_REPORT_EMAIL_RE.test(r))) {
    res.status(400).json({ error: 'recipients contains an invalid email address' });
    return;
  }

  const enabled = Boolean(body.enabled);
  if (enabled && recipients.length === 0) {
    res.status(400).json({ error: 'At least one recipient is required when enabled is true' });
    return;
  }

  activity.scheduledReport = {
    enabled,
    reportType,
    recipients,
    frequency,
    dayOfWeek,
    scheduleHour,
    skipIfUnchanged: Boolean(body.skipIfUnchanged),
    lastSentAt: activity.scheduledReport?.lastSentAt,
    lastSentSnapshot: activity.scheduledReport?.lastSentSnapshot,
  };
  await activity.save();
  logAdminAction(req, 'update_scheduled_report', 'activity', activity._id.toString(), activity.name, { enabled, reportType, frequency });
  res.json({ scheduledReport: activity.scheduledReport });
});

router.post('/activities/:id/duplicate', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Activity.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Activity not found' }); return; }

  const source = existing.toObject() as unknown as Record<string, unknown>;
  delete source._id;
  delete source.code;
  delete source.createdAt;
  delete source.__v;
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
  await Report.deleteMany({ activityId: existing._id });
  await ActivityGroup.deleteMany({ activityId: existing._id });
  logAdminAction(req, 'delete_activity', 'activity', req.params.id, existing.name);
  res.json({ success: true });
});

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
  const results: { games: any[]; stations: any[] } = { games: [], stations: [] };

  const buildQuery = (extraFields: Record<string, unknown>[] = []) => {
    const orConditions = [
      { name: regex },
      { description: regex },
      { tags: regex },
      { customer: regex },
      ...extraFields,
    ];
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

router.get('/random-items', authenticateAdmin, async (req: Request, res: Response) => {
  const gameCount = Math.min(Number(req.query.games) || 4, 20);
  const stationCount = Math.min(Number(req.query.stations) || 2, 20);

  const scope = customerMongoFilter(req);
  const matchStage = Object.keys(scope).length > 0 ? [{ $match: scope }] : [];

  const [games, stations] = await Promise.all([
    Game.aggregate([...matchStage, { $sample: { size: gameCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
    Station.aggregate([...matchStage, { $sample: { size: stationCount } }, { $project: { _id: 1, name: 1, type: 1 } }]),
  ]);

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

router.post('/sms/test', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request<{}, {}, { phoneNumber?: string; message?: string; attachmentUrl?: string; couponCode?: string }>, res: Response) => {
  const phone = (req.body.phoneNumber || '').trim();
  const template = (req.body.message || '').trim() || DEFAULT_SMS_TEMPLATE;
  if (!phone) return res.status(400).json({ error: 'phoneNumber is required' });

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

router.post('/activities/:activityId/scheduled-report/send-now', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request<{ activityId: string }>, res: Response) => {
  const activity = await Activity.findById(req.params.activityId);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (!activity.scheduledReport) {
    res.status(400).json({ error: 'No scheduled report is configured for this activity yet — save the settings first' });
    return;
  }

  try {
    const result = await sendScheduledReportNow(activity);
    res.json({ ok: true, resendId: result.resendId });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Send failed' });
  }
});

export default router;
