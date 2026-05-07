import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';
import { authenticateManager } from '../middleware/managerAuth';
import { ManagerLoginRequest } from '../types';
import { Activity, Report } from '../models';

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

  const reports = await Report.find({ activityCode }).sort({ joinedAt: -1 });

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

export default router;
