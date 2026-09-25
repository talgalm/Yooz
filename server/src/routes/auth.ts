import { Router, Request, Response } from 'express';
import { LoginRequest, LoginResponse } from '../types';
import { Activity, Portal } from '../models';
import { resolveGroupName, createParticipantSession, checkGroupCapacity } from '../utils/participantAuth';
import { getGroupStatus } from '../utils/groupStatus';
import { readLang } from '../utils/requestLang';

const router = Router();

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response<LoginResponse | { error: string }>) => {
  const { activityCode, participantName, email: rawEmail, phoneNumber, group, groupToken } = req.body;
  const email = rawEmail?.trim().toLowerCase();

  if (!activityCode) {
    res.status(400).json({ error: 'Activity code is required' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const loginFields = activity.loginFields || [];

  if (loginFields.includes('email') && !email) {
    res.status(400).json({ error: 'Email is required for this activity' });
    return;
  }

  if (loginFields.includes('name')) {
    if (!participantName) {
      res.status(400).json({ error: 'Name is required for this activity' });
      return;
    }
    if (participantName.length < 2 || participantName.length > 50) {
      res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
      return;
    }
  }

  if (loginFields.includes('phoneNumber') && !phoneNumber) {
    res.status(400).json({ error: 'Phone number is required for this activity' });
    return;
  }

  const connectionType = activity.connectionType || 'single';
  let resolvedGroup: string | undefined;

  if (connectionType === 'group') {
    const groupResult = await resolveGroupName(activity, { group, groupToken });
    if ('error' in groupResult) {
      res.status(groupResult.status).json({ error: groupResult.error });
      return;
    }
    resolvedGroup = groupResult.groupName;

    const capError = await checkGroupCapacity(activity, resolvedGroup, {
      email,
      phoneNumber: phoneNumber?.trim(),
      displayName: participantName?.trim() || email || phoneNumber?.trim() || 'Participant',
    });
    if (capError) {
      res.status(409).json({ error: capError });
      return;
    }
  }

  if (activity.isContinuous && activity.portalId) {
    const portal = await Portal.findById(activity.portalId);
    if (!portal) {
      res.status(403).json({ error: 'portal_not_found' });
      return;
    }
    const lookupIdentifier = (participantName?.trim() || email?.trim() || '').toLowerCase();
    const portalUser = portal.users.find(
      (u) => u.username.toLowerCase() === lookupIdentifier && u.status === 'approved',
    );
    if (!portalUser) {
      res.status(403).json({ error: 'not_portal_user' });
      return;
    }
  }

  const displayName = participantName?.trim()
    || email?.trim()
    || phoneNumber?.trim()
    || 'Participant';

  const session = await createParticipantSession(activity, {
    lang: readLang(req),
    activityCode,
    displayName,
    email: email || undefined,
    phoneNumber: phoneNumber?.trim(),
    group: resolvedGroup,
  });

  let groupStatus;
  if (connectionType === 'group' && activity.groupEntryMode === 'selfService' && resolvedGroup) {
    groupStatus = await getGroupStatus(activity, resolvedGroup);
  }

  res.json({
    ...session,
    ...(groupStatus && { groupStatus }),
  });
});

export default router;
