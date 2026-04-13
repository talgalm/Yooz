import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { CreatePortalRequest, PortalUserRequest } from '../types';
import { Portal, Activity, Report } from '../models';
import { generateInviteToken } from '../models/Portal';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Admin CRUD ───

// Parse Excel file and return users list (does not save to DB)
router.post('/parse-excel', authenticateAdmin, excelUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

    if (rows.length === 0) {
      res.status(400).json({ error: 'Excel file is empty' });
      return;
    }

    // Detect if first row is a header (contains "user", "שם", "name", "password", "סיסמה")
    const headerKeywords = ['user', 'שם', 'name', 'password', 'סיסמה', 'email', 'אימייל'];
    const firstRow = rows[0].map(c => String(c).toLowerCase().trim());
    const isHeader = firstRow.some(cell => headerKeywords.some(kw => cell.includes(kw)));
    const dataRows = isHeader ? rows.slice(1) : rows;

    const users: { username: string; password: string }[] = [];
    for (const row of dataRows) {
      const username = String(row[0] || '').trim();
      if (!username) continue;
      const password = String(row[1] || '').trim() || generatePassword();
      users.push({ username, password });
    }

    if (users.length === 0) {
      res.status(400).json({ error: 'No users found in Excel file' });
      return;
    }

    res.json({ users });
  } catch {
    res.status(400).json({ error: 'Failed to parse Excel file' });
  }
});

// List all portals
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const portals = await Portal.find(customerMongoFilter(req))
    .sort({ createdAt: -1 })
    .populate('activities', 'name code status');
  res.json({ portals });
});

// Create portal
router.post('/', authenticateAdmin, async (req: Request<{}, {}, CreatePortalRequest>, res: Response) => {
  const { name, description, users, activities } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Portal name is required (min 2 characters)' });
    return;
  }

  // Hash passwords for users (admin-created users are auto-approved, must change password on first login)
  const hashedUsers = [];
  if (users && Array.isArray(users)) {
    for (const u of users) {
      if (!u.username || !u.password) continue;
      hashedUsers.push({
        username: u.username.trim(),
        password: await bcrypt.hash(u.password, 10),
        status: 'approved' as const,
        mustChangePassword: true,
      });
    }
  }

  const portal = await Portal.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    users: hashedUsers,
    activities: activities || [],
    createdByEmail: createdByEmailForNewResource(req),
  });

  // Mark activities as attached to this portal and continuous
  if (activities && activities.length > 0) {
    await Activity.updateMany(
      { _id: { $in: activities } },
      { $set: { portalId: portal._id, isContinuous: true } }
    );
  }

  const populated = await Portal.findById(portal._id).populate('activities', 'name code status');
  res.status(201).json({ portal: populated });
});

// Get single portal
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const portal = await Portal.findById(req.params.id).populate('activities', 'name code status');
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }
  if (!customerOwnsDoc(req, portal)) { res.status(404).json({ error: 'Portal not found' }); return; }
  res.json({ portal });
});

// Update portal
router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreatePortalRequest>, res: Response) => {
  const { name, description, users, activities } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Portal name is required (min 2 characters)' });
    return;
  }

  const existing = await Portal.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Portal not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Portal not found' }); return; }

  // Build users array — keep existing hashed passwords if password unchanged
  // Preserve status for existing users, default to 'approved' for admin-added users
  const updatedUsers = [];
  if (users && Array.isArray(users)) {
    for (const u of users) {
      if (!u.username || !u.password) continue;
      const isNewPassword = !u.password.startsWith('$2');
      const pw = isNewPassword ? await bcrypt.hash(u.password, 10) : u.password;
      // Find existing user to preserve status and mustChangePassword
      const existingUser = existing.users.find(eu => eu.username === u.username.trim());
      updatedUsers.push({
        username: u.username.trim(),
        password: pw,
        status: (u as any).status || existingUser?.status || 'approved',
        // New users added by admin must change password; existing users keep their flag
        mustChangePassword: existingUser ? (isNewPassword ? true : existingUser.mustChangePassword ?? false) : true,
      });
    }
  }

  // Also keep self-registered users (pending/denied) that aren't in the admin payload
  for (const eu of existing.users) {
    if (!updatedUsers.some(u => u.username === eu.username)) {
      if (eu.status === 'pending' || eu.status === 'denied') {
        updatedUsers.push({
          username: eu.username,
          password: eu.password,
          status: eu.status,
        });
      }
    }
  }

  // Clear portalId and isContinuous from old activities no longer attached
  const oldActivityIds = existing.activities.map(a => a.toString());
  const newActivityIds = activities || [];
  const removedIds = oldActivityIds.filter(id => !newActivityIds.includes(id));
  if (removedIds.length > 0) {
    await Activity.updateMany(
      { _id: { $in: removedIds } },
      { $unset: { portalId: '' }, $set: { isContinuous: false } }
    );
  }

  // Set portalId and isContinuous on new activities
  if (newActivityIds.length > 0) {
    await Activity.updateMany(
      { _id: { $in: newActivityIds } },
      { $set: { portalId: existing._id, isContinuous: true } }
    );
  }

  const portal = await Portal.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description?.trim() || undefined,
      users: updatedUsers,
      activities: newActivityIds,
    },
    { new: true, runValidators: true }
  ).populate('activities', 'name code status');

  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }
  res.json({ portal });
});

// Delete portal
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Portal.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Portal not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Portal not found' }); return; }

  // Clear portalId and isContinuous from attached activities
  if (existing.activities.length > 0) {
    await Activity.updateMany(
      { _id: { $in: existing.activities } },
      { $unset: { portalId: '' }, $set: { isContinuous: false } }
    );
  }

  await Portal.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ─── Admin: Approve / Deny portal user ───

router.patch('/:id/users/:userId/status', authenticateAdmin, async (req: Request<{ id: string; userId: string }>, res: Response) => {
  const { status } = req.body;
  if (!['approved', 'denied'].includes(status)) {
    res.status(400).json({ error: 'Status must be approved or denied' });
    return;
  }

  const portal = await Portal.findById(req.params.id);
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }
  if (!customerOwnsDoc(req, portal)) { res.status(404).json({ error: 'Portal not found' }); return; }

  const user = (portal.users as any).id(req.params.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  user.status = status;
  await portal.save();

  res.json({ success: true, user: { _id: user._id, username: user.username, status: user.status } });
});

// ─── Admin: Regenerate invite token ───

router.post('/:id/regenerate-invite', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const portal = await Portal.findById(req.params.id);
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }
  if (!customerOwnsDoc(req, portal)) { res.status(404).json({ error: 'Portal not found' }); return; }

  portal.inviteToken = generateInviteToken();
  await portal.save();

  res.json({ success: true, inviteToken: portal.inviteToken });
});

// ─── Public Portal Routes ───

// Get portal info (public - by code)
router.get('/public/:code', async (req: Request<{ code: string }>, res: Response) => {
  const portal = await Portal.findOne({ code: req.params.code })
    .populate('activities', 'name code status opening scheduledStart scheduledEnd');
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  // Only return live activities
  const liveActivities = (portal.activities as any[]).filter((a: any) => a.status === 'live');

  res.json({
    portal: {
      name: portal.name,
      code: portal.code,
      description: portal.description,
      activities: liveActivities.map((a: any) => ({
        _id: a._id,
        name: a.name,
        code: a.code,
        opening: a.opening,
        scheduledStart: a.scheduledStart,
        scheduledEnd: a.scheduledEnd,
      })),
    },
  });
});

// Portal user login
router.post('/public/:code/login', async (req: Request<{ code: string }>, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const portal = await Portal.findOne({ code: req.params.code });
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  const user = portal.users.find(u => u.username === username.trim());
  if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const match = await bcrypt.compare(password, user.password);
  if (!match) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  // Check approval status
  if (user.status === 'pending') {
    res.status(403).json({ error: 'pending_approval' });
    return;
  }
  if (user.status === 'denied') {
    res.status(403).json({ error: 'denied' });
    return;
  }

  const token = jwt.sign(
    { portalCode: portal.code, portalId: portal._id, username: user.username, userId: user._id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { username: user.username },
    ...(user.mustChangePassword && { mustChangePassword: true }),
  });
});

// Portal Google sign-in
router.post('/public/:code/google-login', async (req: Request<{ code: string }>, res: Response) => {
  const { email, inviteToken } = req.body;
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

  const portal = await Portal.findOne({ code: req.params.code });
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  const user = portal.users.find(u => u.username === email.trim());

  if (user) {
    // Existing user — check status
    if (user.status === 'pending') { res.status(403).json({ error: 'pending_approval' }); return; }
    if (user.status === 'denied') { res.status(403).json({ error: 'denied' }); return; }

    const token = jwt.sign(
      { portalCode: portal.code, portalId: portal._id, username: user.username, userId: user._id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { username: user.username } });
    return;
  }

  // New user — auto-approve if valid invite token, otherwise pending
  const isAutoApproved = !!(inviteToken && portal.inviteToken && inviteToken === portal.inviteToken);
  const randomPw = await bcrypt.hash(Math.random().toString(36), 10);
  portal.users.push({
    username: email.trim(),
    password: randomPw,
    status: isAutoApproved ? 'approved' : 'pending',
    createdAt: new Date(),
  } as any);
  await portal.save();

  if (isAutoApproved) {
    const savedUser = portal.users.find(u => u.username === email.trim());
    const token = jwt.sign(
      { portalCode: portal.code, portalId: portal._id, username: email.trim(), userId: savedUser?._id },
      JWT_SECRET,
      { expiresIn: '8h' },
    );
    res.json({ token, user: { username: email.trim() } });
  } else {
    res.status(403).json({ error: 'pending_approval' });
  }
});

// Portal user self-registration
router.post('/public/:code/register', async (req: Request<{ code: string }>, res: Response) => {
  const { username, password, inviteToken } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }

  const portal = await Portal.findOne({ code: req.params.code });
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  // Check if username already exists
  const existing = portal.users.find(u => u.username === username.trim());
  if (existing) {
    res.status(409).json({ error: 'username_taken' });
    return;
  }

  // Auto-approve if valid invite token provided
  const isAutoApproved = !!(inviteToken && portal.inviteToken && inviteToken === portal.inviteToken);
  const hashed = await bcrypt.hash(password, 10);
  portal.users.push({
    username: username.trim(),
    password: hashed,
    status: isAutoApproved ? 'approved' : 'pending',
    createdAt: new Date(),
  } as any);

  await portal.save();

  if (isAutoApproved) {
    // Find the newly saved user to get their _id
    const savedUser = portal.users.find(u => u.username === username.trim());
    const token = jwt.sign(
      { portalCode: portal.code, portalId: portal._id, username: username.trim(), userId: savedUser?._id },
      JWT_SECRET,
      { expiresIn: '8h' },
    );
    res.status(201).json({ success: true, status: 'approved', token, user: { username: username.trim() } });
  } else {
    res.status(201).json({ success: true, status: 'pending' });
  }
});

// Portal user update profile (change display name / password)
router.patch('/public/:code/profile', async (req: Request<{ code: string }>, res: Response) => {
  const { username, currentPassword, newPassword, displayName } = req.body;

  if (!username || !currentPassword) {
    res.status(400).json({ error: 'Username and current password are required' });
    return;
  }

  const portal = await Portal.findOne({ code: req.params.code });
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  const user = portal.users.find(u => u.username === username.trim());
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) { res.status(401).json({ error: 'wrong_password' }); return; }

  if (newPassword) {
    if (newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
  }

  await portal.save();
  res.json({ success: true });
});

// Get history for a portal user (reports across all portal activities)
router.get('/public/:code/history', async (req: Request<{ code: string }>, res: Response) => {
  const { username } = req.query;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'username query param required' });
    return;
  }

  const portal = await Portal.findOne({ code: req.params.code })
    .populate('activities', 'name code');
  if (!portal) { res.status(404).json({ error: 'Portal not found' }); return; }

  const activityCodes = (portal.activities as any[]).map((a: any) => a.code);
  if (activityCodes.length === 0) {
    res.json({ history: [] });
    return;
  }

  // Find reports matching this username across all portal activities
  const reports = await Report.find({
    activityCode: { $in: activityCodes },
    participantName: username.trim(),
  })
    .sort({ joinedAt: -1 })
    .limit(100)
    .lean();

  // Build activity name map
  const activityMap = new Map<string, string>();
  for (const a of portal.activities as any[]) {
    activityMap.set(a.code, a.name);
  }

  // For each report, compute leaderboard position
  const history = await Promise.all(reports.map(async (r) => {
    let position: number | null = null;
    const totalScore = (r.data as any)?.totalScore;

    if (totalScore != null) {
      const higherCount = await Report.countDocuments({
        activityCode: r.activityCode,
        'data.totalScore': { $gt: totalScore },
      });
      position = higherCount + 1;
    }

    return {
      activityCode: r.activityCode,
      activityName: activityMap.get(r.activityCode) || r.activityCode,
      completionStatus: r.completionStatus,
      totalScore: totalScore ?? null,
      joinedAt: r.joinedAt,
      sessionCompletedAt: r.sessionCompletedAt,
      sessionDurationMs: r.sessionDurationMs,
      position,
    };
  }));

  res.json({ history });
});

export default router;
