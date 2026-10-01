import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { ManageUser, ManageRole, effectiveHourlyCost } from '../models/manage/ManageUser';
import { TimeEntry } from '../models/manage/TimeEntry';
import { TravelEntry } from '../models/manage/TravelEntry';
import { round1, round2 } from '../services/manageMetrics';
import { getSettings } from '../services/manageSettings';

const router = Router();
router.use(authenticateManage);
router.use(requireManageRole('owner'));

export const VALID_ROLES: ManageRole[] = ['owner', 'pm', 'member'];

const PALETTE = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#fdcb6e', '#e84393', '#00cec9', '#636e72'];

export async function createEmployeeProfile(name: string, email: string, role: ManageRole) {
  const defaults = (await getSettings()).defaults;
  return ManageUser.create({
    name,
    email,
    role,
    color: PALETTE[(await ManageUser.countDocuments()) % PALETTE.length],
    weeklyCapacityHours: defaults.weeklyCapacityHours,
    employerCostFactor: defaults.employerCostFactor,
  });
}

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'invalid_id' });
  return true;
}

function serializeEmployee(u: Record<string, unknown>, role: ManageRole, monthly: { hours: number; cost: number; travel: number }) {
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
    monthTravel: monthly.travel,
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

async function monthlyTotals(): Promise<Record<string, { hours: number; cost: number; travel: number }>> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const rows = await TimeEntry.aggregate<{ _id: Types.ObjectId; minutes: number; cost: number }>([
    { $match: { endedAt: { $ne: null }, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$userId', minutes: { $sum: '$minutes' }, cost: { $sum: '$costAmount' } } },
  ]);
  const travelRows = await TravelEntry.aggregate<{ _id: Types.ObjectId; amount: number }>([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: '$userId', amount: { $sum: '$amount' } } },
  ]);
  const travel = Object.fromEntries(travelRows.map((r) => [String(r._id), round2(r.amount)]));
  const totals: Record<string, { hours: number; cost: number; travel: number }> = {};
  for (const id of new Set([...rows.map((r) => String(r._id)), ...Object.keys(travel)])) {
    const r = rows.find((x) => String(x._id) === id);
    totals[id] = { hours: r ? round1(r.minutes / 60) : 0, cost: r ? round2(r.cost) : 0, travel: travel[id] ?? 0 };
  }
  return totals;
}

router.get('/', async (req: Request, res: Response) => {
  const users = await ManageUser.find(req.query.all === 'true' ? {} : { active: true })
    .sort({ active: -1, name: 1 }).lean();
  const totals = await monthlyTotals();
  res.json({
    employees: users.map((u) => serializeEmployee(
      u as never,
      req.manageUser!.role,
      totals[String(u._id)] ?? { hours: 0, cost: 0, travel: 0 },
    )),
  });
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

  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'nothing_to_update' }); return; }

  const user = await ManageUser.findByIdAndUpdate(String(req.params.id), update, { new: true }).lean();
  if (!user) { res.status(404).json({ error: 'not_found' }); return; }

  const totals = await monthlyTotals();
  res.json({ employee: serializeEmployee(user as never, 'owner', totals[String(user._id)] ?? { hours: 0, cost: 0, travel: 0 }) });
});

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
