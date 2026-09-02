import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { ManageUser, ManageRole, effectiveHourlyCost } from '../models/manage/ManageUser';
import { TimeEntry } from '../models/manage/TimeEntry';
import { round1, round2 } from '../services/manageMetrics';
import { getSettings } from '../services/manageSettings';

const router = Router();
router.use(authenticateManage);
// pm gets a reduced view of the same screen; a member has no access.
router.use(requireManageRole('owner', 'pm'));

const VALID_ROLES: ManageRole[] = ['owner', 'pm', 'member'];

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'invalid_id' });
  return true;
}

/**
 * A pm sees name, role, capacity and hours — no shekels, ever.
 * Same rule as everywhere else: the shape is decided here, not in the UI.
 */
function serializeEmployee(u: Record<string, unknown>, role: ManageRole, monthly: { hours: number; cost: number }) {
  const base = {
    _id: u._id,
    name: u.name,
    role: u.role,
    active: u.active,
    tracksTime: u.tracksTime,
    weeklyCapacityHours: u.weeklyCapacityHours,
    workDays: u.workDays,
    color: u.color,
    monthHours: monthly.hours,
  };
  if (role !== 'owner') return base;
  return {
    ...base,
    email: u.email,
    phone: u.phone,
    startDate: u.startDate,
    hourlyCost: u.hourlyCost,
    employerCostFactor: u.employerCostFactor,
    effectiveHourlyCost: effectiveHourlyCost(u as never),
    monthCost: monthly.cost,
  };
}

/** Hours and cost logged this calendar month, per user, in one query. */
async function monthlyTotals(): Promise<Record<string, { hours: number; cost: number }>> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const rows = await TimeEntry.aggregate<{ _id: Types.ObjectId; minutes: number; cost: number }>([
    { $match: { endedAt: { $ne: null }, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$userId', minutes: { $sum: '$minutes' }, cost: { $sum: '$costAmount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { hours: round1(r.minutes / 60), cost: round2(r.cost) }]));
}

router.get('/', async (req: Request, res: Response) => {
  // Inactive people stay listed — their hours are still in the history.
  const users = await ManageUser.find(req.query.all === 'true' ? {} : { active: true })
    .sort({ active: -1, name: 1 }).lean();
  const totals = await monthlyTotals();
  res.json({
    employees: users.map((u) => serializeEmployee(
      u as never,
      req.manageUser!.role,
      totals[String(u._id)] ?? { hours: 0, cost: 0 },
    )),
  });
});

router.post('/', requireManageRole('owner'), async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) { res.status(400).json({ error: 'name_required' }); return; }
  if (!email || !email.includes('@')) { res.status(400).json({ error: 'valid_email_required' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'password_too_short' }); return; }
  if (!VALID_ROLES.includes(body.role as ManageRole)) { res.status(400).json({ error: 'invalid_role' }); return; }
  if (await ManageUser.findOne({ email })) { res.status(409).json({ error: 'email_taken' }); return; }

  const defaults = (await getSettings()).defaults;
  const user = await ManageUser.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: body.role as ManageRole,
    phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
    color: typeof body.color === 'string' ? body.color : '#6c5ce7',
    tracksTime: body.tracksTime !== false,
    weeklyCapacityHours: Number(body.weeklyCapacityHours) || defaults.weeklyCapacityHours,
    hourlyCost: Number(body.hourlyCost) || 0,
    employerCostFactor: Number.isFinite(Number(body.employerCostFactor))
      ? Number(body.employerCostFactor)
      : defaults.employerCostFactor,
  });

  res.status(201).json({ employee: serializeEmployee(user.toObject() as never, 'owner', { hours: 0, cost: 0 }) });
});

router.patch('/:id', requireManageRole('owner'), async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const k of ['name', 'phone', 'color']) {
    if (typeof body[k] === 'string') update[k] = (body[k] as string).trim();
  }
  if (VALID_ROLES.includes(body.role as ManageRole)) update.role = body.role;
  if (typeof body.tracksTime === 'boolean') update.tracksTime = body.tracksTime;
  if (typeof body.active === 'boolean') update.active = body.active;
  if (Number.isFinite(Number(body.weeklyCapacityHours))) update.weeklyCapacityHours = Number(body.weeklyCapacityHours);
  if (Number.isFinite(Number(body.hourlyCost)) && Number(body.hourlyCost) >= 0) update.hourlyCost = round2(Number(body.hourlyCost));
  if (Number.isFinite(Number(body.employerCostFactor)) && Number(body.employerCostFactor) >= 0) {
    update.employerCostFactor = Number(body.employerCostFactor);
  }
  if (Array.isArray(body.workDays)) {
    update.workDays = (body.workDays as unknown[]).filter((d) => typeof d === 'number' && d >= 0 && d <= 6);
  }

  // Email changes the login identity, so it is checked for collision separately.
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    const clash = await ManageUser.findOne({ email, _id: { $ne: String(req.params.id) } });
    if (clash) { res.status(409).json({ error: 'email_taken' }); return; }
    update.email = email;
  }

  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'nothing_to_update' }); return; }

  const user = await ManageUser.findByIdAndUpdate(String(req.params.id), update, { new: true }).lean();
  if (!user) { res.status(404).json({ error: 'not_found' }); return; }

  const totals = await monthlyTotals();
  res.json({ employee: serializeEmployee(user as never, 'owner', totals[String(user._id)] ?? { hours: 0, cost: 0 }) });
});

router.post('/:id/reset-password', requireManageRole('owner'), async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const password = (req.body ?? {}).password;
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'password_too_short' });
    return;
  }
  const user = await ManageUser.findByIdAndUpdate(
    String(req.params.id),
    { passwordHash: await bcrypt.hash(password, 10) },
    { new: true },
  );
  if (!user) { res.status(404).json({ error: 'not_found' }); return; }
  res.json({ ok: true });
});

/**
 * Deactivate, never delete.
 *
 * A departed employee's time entries are the history of what projects cost.
 * Deleting the person would orphan every one of them and silently change last
 * year's profitability, so the only "removal" is a flag.
 */
router.delete('/:id', requireManageRole('owner'), async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  if (String(req.params.id) === req.manageUser!.userId) {
    res.status(400).json({ error: 'cannot_deactivate_self' });
    return;
  }
  const user = await ManageUser.findByIdAndUpdate(String(req.params.id), { active: false }, { new: true });
  if (!user) { res.status(404).json({ error: 'not_found' }); return; }
  res.json({ ok: true, active: false });
});

export default router;
