import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { User } from '../models';
import { logAdminAction } from './admin';
import { ManageUser, ManageRole } from '../models/manage/ManageUser';
import { createEmployeeProfile, VALID_ROLES as MANAGE_ROLES } from './manageEmployees';

const router = Router();

const ADMIN_ROLES = ['viewer', 'admin', 'super_admin', 'customer'];

async function employeeProfileFor(email: string, name: string | undefined, manageRole: unknown, res: Response) {
  if (!MANAGE_ROLES.includes(manageRole as ManageRole)) {
    res.status(400).json({ error: 'Invalid manage role' });
    return null;
  }
  if (await ManageUser.findOne({ email })) {
    res.status(409).json({ error: 'A Manage employee with this email already exists' });
    return null;
  }
  return createEmployeeProfile(name || email.split('@')[0], email, manageRole as ManageRole);
}

router.use(authenticateAdmin, requireRole('super_admin'));

router.get('/', async (_req: Request, res: Response) => {
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
  res.json({ users });
});

router.post('/', async (req: Request, res: Response) => {
  const { email, password, role, name, manageRole } = req.body;

  if (!email || !email.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!role || ![...ADMIN_ROLES, 'employee'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  const userData: Record<string, unknown> = {
    email: email.toLowerCase().trim(),
    role,
    name: name?.trim() || undefined,
  };

  if (role === 'employee') {
    const profile = await employeeProfileFor(userData.email as string, userData.name as string | undefined, manageRole, res);
    if (!profile) return;
    userData.role = 'super_admin';
    userData.manageUserId = profile._id;
  }

  if (password) {
    userData.password = await bcrypt.hash(password, 10);
  }

  const user = await User.create(userData);
  logAdminAction(req, 'create_user', 'user', user._id.toString(), user.email);
  const { password: _, ...safeUser } = user.toObject();
  res.status(201).json({ user: safeUser });
});

router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { email, password, role, name, manageRole } = req.body;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (email) update.email = email.toLowerCase().trim();
  if (role === 'employee' && !target.manageUserId) {
    const profile = await employeeProfileFor((update.email as string) ?? target.email, name?.trim() || target.name, manageRole, res);
    if (!profile) return;
    update.role = 'super_admin';
    update.manageUserId = profile._id;
  } else if (role && ADMIN_ROLES.includes(role) && !target.manageUserId) {
    if (target.role === 'super_admin' && role !== 'super_admin') {
      const superCount = await User.countDocuments({ role: 'super_admin' });
      if (superCount <= 1) {
        res.status(400).json({ error: 'Cannot demote the last super admin' });
        return;
      }
    }
    update.role = role;
  }
  if (name !== undefined) update.name = name?.trim() || undefined;
  if (password) update.password = await bcrypt.hash(password, 10);

  const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
    .select('-password');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.manageUserId) {
    const profileUpdate: Record<string, string> = { email: user.email };
    if (user.name) profileUpdate.name = user.name;
    await ManageUser.updateOne({ _id: target.manageUserId }, { $set: profileUpdate });
  }
  logAdminAction(req, 'update_user', 'user', req.params.id, user.email);
  res.json({ user });
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const adminUserId = req.admin?.userId;
  if (req.params.id === adminUserId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.role === 'super_admin') {
    const superCount = await User.countDocuments({ role: 'super_admin' });
    if (superCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the last super admin' });
      return;
    }
  }

  await User.findByIdAndDelete(req.params.id);
  if (target.manageUserId) await ManageUser.updateOne({ _id: target.manageUserId }, { $set: { active: false } });
  logAdminAction(req, 'delete_user', 'user', req.params.id, target.email);
  res.json({ success: true });
});

export default router;
