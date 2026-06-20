import { Router, Request, Response } from 'express';
import { Activity, ActivityGroup, normalizeGroupName, Portal } from '../models';
import { CreateGroupRequest, CreateGroupResponse } from '../types';
import { requestOrigin } from '../utils/shareOgPage';
import { authenticateToken } from '../middleware/auth';
import { getGroupStatus } from '../utils/groupStatus';
import {
  validateGroupName,
  createParticipantSession,
} from '../utils/participantAuth';

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

// Debounced uniqueness check for group name
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
  const existing = await ActivityGroup.findOne({ activityId: activity._id, nameNormalized: normalized });
  res.json({ available: !existing });
});

// Resolve group name → invite token (for join-by-name screen)
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
  const group = await ActivityGroup.findOne({ activityId: activity._id, nameNormalized: normalized });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  res.json({ name: group.name, inviteToken: group.inviteToken, valid: true });
});

// Resolve invite token → group name (for join-via-link screen)
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

  res.json({ name: group.name, valid: true });
});

// Authenticated: current participant's group readiness (member count, can start play)
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

// Create a new group + log in the creator
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

  const trimmedName = name.trim();
  const normalized = normalizeGroupName(trimmedName);

  let activityGroup;
  try {
    activityGroup = await ActivityGroup.create({
      activityId: activity._id,
      activityCode: code,
      name: trimmedName,
      nameNormalized: normalized,
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
