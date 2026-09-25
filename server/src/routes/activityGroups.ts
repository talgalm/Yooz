import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { Activity, ActivityGroup, normalizeGroupName, PhoneRegistration, Portal } from '../models';
import { CreateGroupRequest, CreateGroupResponse } from '../types';
import { requestOrigin } from '../utils/shareOgPage';
import { authenticateToken } from '../middleware/auth';
import { getGroupStatus } from '../utils/groupStatus';
import { israelDayFromDdMmYyyy, israelDayString } from '../utils/israelTime';
import { normalizePhone } from '../utils/phone';
import { REGISTER_PHONE_KEY } from '../config';
import {
  validateGroupName,
  createParticipantSession,
} from '../utils/participantAuth';
import { readLang } from '../utils/requestLang';

const router = Router();

function validateParticipantFields(
  loginFields: string[],
  participantName?: string,
  email?: string,
  phoneNumber?: string,
): string | null {
  if (loginFields.includes('email') && !email) {
    return 'Email is required for this activity';
  }
  if (loginFields.includes('name')) {
    if (!participantName) return 'Name is required for this activity';
    if (participantName.length < 2 || participantName.length > 50) {
      return 'Name must be between 2 and 50 characters';
    }
  }
  if (loginFields.includes('phoneNumber') && !phoneNumber) {
    return 'Phone number is required for this activity';
  }
  return null;
}

async function validatePortalUser(activity: Awaited<ReturnType<typeof Activity.findOne>>, participantName?: string, email?: string) {
  if (!activity?.isContinuous || !activity.portalId) return null;
  const portal = await Portal.findById(activity.portalId);
  if (!portal) return 'portal_not_found';
  const lookupIdentifier = (participantName?.trim() || email?.trim() || '').toLowerCase();
  const portalUser = portal.users.find(
    (u) => u.username.toLowerCase() === lookupIdentifier && u.status === 'approved',
  );
  if (!portalUser) return 'not_portal_user';
  return null;
}

async function registerPhone(rawPhone: string, rawCode: string, rawDay: string, res: Response) {
  const phone = normalizePhone(rawPhone || '');
  if (phone.length < 6) {
    res.status(400).json({ error: 'invalid_phone' });
    return;
  }

  const day = (rawDay || '').trim() ? israelDayFromDdMmYyyy(rawDay) : israelDayString();
  if (!day) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }

  const code = (rawCode || '').trim();
  if (code) {
    const activity = await Activity.findOne({ code, userControl: true }, { _id: 1 });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
  }

  const activityCode = code || null;
  await PhoneRegistration.updateOne(
    { phone, activityCode, activityDay: day },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  const [y, m, d] = day.split('-');
  res.json({ ok: true, phone, activityCode, date: `${d}-${m}-${y}` });
}

router.get('/register-phone', async (req: Request, res: Response) => {
  if (!REGISTER_PHONE_KEY) {
    res.status(503).json({ error: 'register_key_not_configured' });
    return;
  }
  const given = (req.get('x-api-key') || (req.query.key as string) || '').trim();
  const a = Buffer.from(given);
  const b = Buffer.from(REGISTER_PHONE_KEY);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  await registerPhone(
    (req.query.phone as string) || '',
    (req.query.code as string) || '',
    (req.query.date as string) || '',
    res,
  );
});

router.post('/control/:id/register', async (req: Request<{ id: string }>, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const activity = await Activity.findOne({ _id: req.params.id, userControl: true }, { code: 1 });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  await registerPhone((req.body?.phone as string) || '', activity.code, '', res);
});

router.get('/:code/groups/check-name', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;
  const rawName = (req.query.name as string) || '';
  const nameError = validateGroupName(rawName);
  if (nameError) {
    res.json({ available: false, reason: 'invalid' });
    return;
  }

  const activity = await Activity.findOne({ code });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const normalized = normalizeGroupName(rawName);
  const existing = await ActivityGroup.findOne({
    activityId: activity._id,
    activityDay: israelDayString(),
    nameNormalized: normalized,
  });
  res.json({ available: !existing });
});

router.get('/:code/groups/today', async (req: Request<{ code: string }>, res: Response) => {
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const groups = await ActivityGroup.find(
    { activityId: activity._id, activityDay: israelDayString() },
    { name: 1, inviteToken: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ groups: groups.map((g) => ({ name: g.name, inviteToken: g.inviteToken })) });
});

router.get('/:code/groups/by-name', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;
  const rawName = (req.query.name as string) || '';
  const nameError = validateGroupName(rawName);
  if (nameError) {
    res.status(400).json({ error: nameError });
    return;
  }

  const activity = await Activity.findOne({ code });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const normalized = normalizeGroupName(rawName);
  const group = await ActivityGroup.findOne({
    activityId: activity._id,
    activityDay: israelDayString(),
    nameNormalized: normalized,
  });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  res.json({ name: group.name, inviteToken: group.inviteToken, valid: true });
});

router.get('/:code/groups/by-token/:token', async (req: Request<{ code: string; token: string }>, res: Response) => {
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const group = await ActivityGroup.findOne({
    activityId: activity._id,
    inviteToken: req.params.token.trim(),
  });
  if (!group) {
    res.status(404).json({ error: 'Invalid group invite link' });
    return;
  }
  if (group.activityDay !== israelDayString()) {
    res.status(410).json({ error: 'This group invite link has expired' });
    return;
  }

  res.json({ name: group.name, valid: true });
});

router.get('/:code/groups/status', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const { activityCode, group } = req.participant!;
  if (req.params.code !== activityCode) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService' || !group) {
    res.status(404).json({ error: 'Group status not available' });
    return;
  }

  const status = await getGroupStatus(activity, group);
  if (!status) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  res.json(status);
});

const TICKET_CODE = process.env.GROUP_CAPACITY_CODE || '2026';

router.post('/:code/groups/redeem-capacity', async (req: Request<{ code: string }, {}, { groupToken?: string; code?: string }>, res: Response) => {
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity || activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (String(req.body.code ?? '').trim() !== TICKET_CODE) {
    res.status(403).json({ error: 'invalid_code' });
    return;
  }

  const group = await ActivityGroup.findOne({
    activityId: activity._id,
    inviteToken: String(req.body.groupToken ?? '').trim(),
  });
  if (!group || group.activityDay !== israelDayString()) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const currentMax = group.maxMembersOverride ?? activity.groupMaxMembers ?? 0;
  if (currentMax > 0) {
    group.maxMembersOverride = currentMax * 2;
    await group.save();
  }
  res.json({ ok: true, maxMembers: group.maxMembersOverride ?? 0 });
});

router.post('/:code/groups', async (req: Request<{ code: string }, {}, CreateGroupRequest>, res: Response<CreateGroupResponse | { error: string }>) => {
  const { code } = req.params;
  const { name, participantName, phoneNumber, email: rawEmail } = req.body;
  const email = rawEmail?.trim().toLowerCase();

  const activity = await Activity.findOne({ code });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') {
    res.status(400).json({ error: 'This activity does not support group creation' });
    return;
  }

  const nameError = validateGroupName(name || '');
  if (nameError) {
    res.status(400).json({ error: nameError });
    return;
  }

  const loginFields = activity.loginFields || [];
  const fieldError = validateParticipantFields(loginFields, participantName, email, phoneNumber);
  if (fieldError) {
    res.status(400).json({ error: fieldError });
    return;
  }

  const portalError = await validatePortalUser(activity, participantName, email);
  if (portalError) {
    res.status(403).json({ error: portalError });
    return;
  }

  if (activity.userControl) {
    const registered = await PhoneRegistration.exists({
      phone: normalizePhone(phoneNumber || ''),
      activityDay: israelDayString(),
      activityCode: { $in: [activity.code, null] },
    });
    if (!registered) {
      res.status(403).json({ error: 'not_registered' });
      return;
    }
  }

  const trimmedName = name.trim();
  const normalized = normalizeGroupName(trimmedName);

  let activityGroup;
  try {
    activityGroup = await ActivityGroup.create({
      activityId: activity._id,
      activityCode: code,
      name: trimmedName,
      nameNormalized: normalized,
      activityDay: israelDayString(),
      createdByName: participantName?.trim(),
    });
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      res.status(409).json({ error: 'Group name is already taken' });
      return;
    }
    throw err;
  }

  const displayName = participantName?.trim()
    || email?.trim()
    || phoneNumber?.trim()
    || 'Participant';

  const session = await createParticipantSession(activity, {
    lang: readLang(req),
    activityCode: code,
    displayName,
    email: email || undefined,
    phoneNumber: phoneNumber?.trim(),
    group: activityGroup.name,
  });

  const origin = requestOrigin(req);
  const inviteUrl = `${origin}/play/${code}/join/${activityGroup.inviteToken}`;
  const groupStatus = await getGroupStatus(activity, activityGroup.name);

  res.status(201).json({
    ...session,
    group: {
      name: activityGroup.name,
      inviteToken: activityGroup.inviteToken,
      inviteUrl,
    },
    ...(groupStatus && { groupStatus }),
  });
});

export default router;
