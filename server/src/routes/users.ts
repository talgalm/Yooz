import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { User } from '../models';
import { logAdminAction } from './admin';

const router = Router();

// All user routes require super_admin role
router.use(authenticateAdmin, requireRole('super_admin'));

// List all users
router.get('/', async (_req: Request, res: Response) => {
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
  res.json({ users });
});

// Create user
router.post('/', async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body;

  if (!email || !email.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!role || !['viewer', 'admin', 'super_admin'].includes(role)) {
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

  if (password) {
    userData.password = await bcrypt.hash(password, 10);
  }

  const user = await User.create(userData);
  logAdminAction(req, 'create_user', 'user', user._id.toString(), user.email);
  const { password: _, ...safeUser } = user.toObject();
  res.status(201).json({ user: safeUser });
});

// Update user
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { email, password, role, name } = req.body;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (email) update.email = email.toLowerCase().trim();
  if (role && ['viewer', 'admin', 'super_admin'].includes(role)) {
    // Prevent demoting the last super_admin
    const target = await User.findById(req.params.id);
    if (target && target.role === 'super_admin' && role !== 'super_admin') {
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
  logAdminAction(req, 'update_user', 'user', req.params.id, user.email);
  res.json({ user });
});

// Delete user
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  // Prevent deleting yourself
  const adminUserId = req.admin?.userId;
  if (req.params.id === adminUserId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  // Prevent deleting the last super_admin
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
  logAdminAction(req, 'delete_user', 'user', req.params.id, target.email);
  res.json({ success: true });
});

export default router;
