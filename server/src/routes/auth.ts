import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { LoginRequest, LoginResponse } from '../types';
import { Activity, Report } from '../models';

const router = Router();

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response<LoginResponse | { error: string }>) => {
  const { activityCode, participantName, email, phoneNumber, group } = req.body;

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

  // Validate required fields based on activity config
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

  // Validate group if activity is group type
  const connectionType = activity.connectionType || 'single';
  if (connectionType === 'group') {
    if (!group) {
      res.status(400).json({ error: 'Group selection is required for this activity' });
      return;
    }
    const validGroups = (activity.groups || []).map((g) => g.name);
    if (!validGroups.includes(group)) {
      res.status(400).json({ error: 'Invalid group selection' });
      return;
    }
  }

  // Determine display name: prefer name > email > phone
  const displayName = participantName?.trim()
    || email?.trim()
    || phoneNumber?.trim()
    || 'Participant';

  // Look for an existing Report for this participant in this activity
  // Priority: email > phoneNumber > participantName
  const lookupQuery: Record<string, unknown> = { activityCode };
  if (email) {
    lookupQuery.email = email.trim();
  } else if (phoneNumber) {
    lookupQuery.phoneNumber = phoneNumber.trim();
  } else {
    lookupQuery.participantName = displayName;
  }

  const existingReport = await Report.findOne(lookupQuery).sort({ joinedAt: -1 });

  // Use existing report's participantName so progress endpoints stay consistent
  const resolvedName = existingReport?.participantName || displayName;

  if (!existingReport) {
    await Report.create({
      activityId: activity._id,
      activityCode,
      participantName: resolvedName,
      email: email?.trim(),
      phoneNumber: phoneNumber?.trim(),
      connectionType,
      group,
    });
  }

  const token = jwt.sign(
    {
      participantName: resolvedName,
      activityCode,
      connectionType,
      ...(email && { email: email.trim() }),
      ...(phoneNumber && { phoneNumber: phoneNumber.trim() }),
      ...(group && { group }),
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    participant: {
      name: resolvedName,
      activityCode,
      connectionType: connectionType as 'single' | 'group',
      ...(email && { email: email.trim() }),
      ...(phoneNumber && { phoneNumber: phoneNumber.trim() }),
      ...(group && { group }),
    },
  });
});

export default router;
