import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { ManageLoginRequest, ManageJwtPayload } from '../types';
import { ManageUser, IManageUser } from '../models/manage/ManageUser';

const router = Router();

const TOKEN_TTL = '12h';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 5 * 60_000);

export function serializeManageUser(u: IManageUser, role: 'owner' | 'pm' | 'member') {
  const base = {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    color: u.color,
    active: u.active,
    weeklyCapacityHours: u.weeklyCapacityHours,
    workDays: u.workDays,
    tracksTime: u.tracksTime,
    startDate: u.startDate,
  };
  if (role !== 'owner') return base;
  return {
    ...base,
    hourlyCost: u.hourlyCost,
    employerCostFactor: u.employerCostFactor,
    notes: u.notes,
  };
}

router.post('/auth/login', async (req: Request<{}, {}, ManageLoginRequest>, res: Response) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await ManageUser.findOne({ email: email.toLowerCase().trim(), active: true });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload: ManageJwtPayload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    realm: 'manage',
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

  res.json({ token, user: serializeManageUser(user, user.role) });
});

router.get('/auth/me', authenticateManage, async (req: Request, res: Response) => {
  const user = await ManageUser.findById(req.manageUser!.userId);
  if (!user || !user.active) {
    res.status(401).json({ error: 'User no longer active' });
    return;
  }
  res.json({ user: serializeManageUser(user, user.role) });
});

router.get('/users', authenticateManage, requireManageRole('owner', 'pm'), async (req: Request, res: Response) => {
  const users = await ManageUser.find({ active: true }).sort({ name: 1 });
  res.json({ users: users.map((u) => serializeManageUser(u, req.manageUser!.role)) });
});

export default router;
