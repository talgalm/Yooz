import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { ManageJwtPayload } from '../types';
import { User } from '../models';
import { ManageUser, IManageUser } from '../models/manage/ManageUser';

const router = Router();

const TOKEN_TTL = '12h';

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

function sessionFor(user: IManageUser) {
  const payload: ManageJwtPayload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    realm: 'manage',
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
  return { token, user: serializeManageUser(user, user.role) };
}

router.post('/auth/from-admin', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const admin = await User.findById(req.admin!.userId);
  const user = admin?.manageUserId && await ManageUser.findOne({ _id: admin.manageUserId, active: true });
  if (!user) {
    res.status(404).json({ error: 'no_linked_manage_user' });
    return;
  }
  res.json(sessionFor(user));
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
