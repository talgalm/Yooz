import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import {
  TimeEntry, TIME_CATEGORIES, CATEGORIES_REQUIRING_PROJECT, TimeCategory,
  MAX_HOURS_PER_DAY,
} from '../models/manage/TimeEntry';
import { Project } from '../models/manage/Project';
import { ManageUser, effectiveHourlyCost } from '../models/manage/ManageUser';
import { round2 } from '../services/manageMetrics';
import { getSettings, categoriesRequiringProject } from '../services/manageSettings';

const router = Router();
router.use(authenticateManage);

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'Invalid id' });
  return true;
}

function serializeTimeEntry(doc: any, role: string) {
  const base = {
    _id: doc._id,
    userId: doc.userId,
    date: doc.date,
    minutes: doc.minutes,
    category: doc.category,
    projectId: doc.projectId,
    taskId: doc.taskId,
    note: doc.note,
    source: doc.source,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    afterProjectClose: doc.afterProjectClose,
    locked: doc.locked,
    autoStopped: doc.autoStopped,
  };
  if (role !== 'owner') return base;
  return { ...base, costRateSnapshot: doc.costRateSnapshot, costAmount: doc.costAmount };
}

function toLocalMidnight(input: string | Date): Date {
  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function scopeUserId(req: Request, requested?: string): string | null {
  const { role, userId } = req.manageUser!;
  if (role === 'member') return userId;
  if (requested && Types.ObjectId.isValid(requested)) return requested;
  return null;
}

async function validateEntry(
  userId: string,
  body: { date: Date; minutes: number; category: TimeCategory; projectId?: string },
  excludeEntryId?: string,
): Promise<{ error: string; detail?: unknown } | null> {
  const { date, minutes, category, projectId } = body;
  const settings = await getSettings();
  const maxHours = settings.defaults.maxHoursPerDay;
  const needsProject = settings.timeCategories.filter((c) => c.requiresProject).map((c) => c.key);

  if (!TIME_CATEGORIES.includes(category)) return { error: 'invalid_category' };
  if (!Number.isInteger(minutes) || minutes < 1) return { error: 'minutes_must_be_positive' };
  if (minutes > maxHours * 60) return { error: 'exceeds_daily_max', detail: { max: maxHours } };

  if (date.getTime() > endOfDay(new Date()).getTime()) return { error: 'future_date' };

  if (needsProject.includes(category) && !projectId) {
    return { error: 'project_required', detail: { category } };
  }

  const dayFilter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    date: { $gte: date, $lte: endOfDay(date) },
    endedAt: { $ne: null },
  };
  if (excludeEntryId) dayFilter._id = { $ne: new Types.ObjectId(excludeEntryId) };
  const [agg] = await TimeEntry.aggregate<{ total: number }>([
    { $match: dayFilter },
    { $group: { _id: null, total: { $sum: '$minutes' } } },
  ]);
  const dayTotal = (agg?.total ?? 0) + minutes;
  if (dayTotal > maxHours * 60) {
    return { error: 'day_total_exceeded', detail: { max: maxHours, wouldBe: round2(dayTotal / 60) } };
  }
  return null;
}

async function costFor(userId: string, minutes: number) {
  const user = await ManageUser.findById(userId).select('hourlyCost employerCostFactor').lean();
  const rate = user ? effectiveHourlyCost(user) : 0;
  return { costRateSnapshot: rate, costAmount: round2((minutes / 60) * rate) };
}

async function projectClosedFlag(projectId?: string): Promise<boolean> {
  if (!projectId) return false;
  const p = await Project.findById(projectId).select('status').lean();
  return p ? p.status === 'done' || p.status === 'cancelled' : false;
}

router.get('/categories', async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({
    categories: settings.timeCategories,
    requiringProject: settings.timeCategories.filter((c) => c.requiresProject).map((c) => c.key),
  });
});

router.get('/timer', async (req: Request, res: Response) => {
  const timer = await TimeEntry.findOne({ userId: req.manageUser!.userId, endedAt: null }).lean();
  res.json({ timer: timer ? serializeTimeEntry(timer, req.manageUser!.role) : null });
});

router.post('/timer/start', async (req: Request, res: Response) => {
  const userId = req.manageUser!.userId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const category = body.category as TimeCategory;

  if (!TIME_CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'invalid_category' });
    return;
  }
  const projectId = typeof body.projectId === 'string' && Types.ObjectId.isValid(body.projectId)
    ? body.projectId : undefined;
  if ((await categoriesRequiringProject()).includes(category) && !projectId) {
    res.status(400).json({ error: 'project_required', detail: { category } });
    return;
  }

  const stopped = await stopRunningTimer(userId);

  const now = new Date();
  const timer = await TimeEntry.create({
    userId,
    date: toLocalMidnight(now),
    minutes: 0,
    category,
    projectId,
    note: typeof body.note === 'string' ? body.note.trim() : undefined,
    source: 'timer',
    startedAt: now,
    endedAt: undefined,
    afterProjectClose: await projectClosedFlag(projectId),
  });

  res.status(201).json({
    timer: serializeTimeEntry(timer.toObject(), req.manageUser!.role),
    stoppedPrevious: stopped ? serializeTimeEntry(stopped, req.manageUser!.role) : null,
  });
});

router.post('/timer/stop', async (req: Request, res: Response) => {
  const stopped = await stopRunningTimer(req.manageUser!.userId);
  if (!stopped) {
    res.status(404).json({ error: 'no_running_timer' });
    return;
  }
  res.json({ entry: serializeTimeEntry(stopped, req.manageUser!.role) });
});

export async function stopRunningTimer(
  userId: string,
  opts: { autoStopped?: boolean } = {},
): Promise<any | null> {
  const timer = await TimeEntry.findOne({ userId, endedAt: null });
  if (!timer) return null;

  const now = new Date();
  const minutes = Math.max(0, Math.round((now.getTime() - (timer.startedAt ?? now).getTime()) / 60_000));
  if (minutes < 1) {
    await timer.deleteOne();
    return null;
  }

  const { costRateSnapshot, costAmount } = await costFor(userId, minutes);
  timer.minutes = minutes;
  timer.endedAt = now;
  timer.costRateSnapshot = costRateSnapshot;
  timer.costAmount = costAmount;
  if (opts.autoStopped) timer.autoStopped = true;
  await timer.save();
  return timer.toObject();
}

router.get('/', async (req: Request, res: Response) => {
  const { from, to, userId, projectId, category } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { endedAt: { $ne: null } };

  const scoped = scopeUserId(req, userId);
  if (scoped) filter.userId = scoped;
  if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
  if (category && TIME_CATEGORIES.includes(category as TimeCategory)) filter.category = category;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = toLocalMidnight(from);
    if (to) range.$lte = endOfDay(toLocalMidnight(to));
    filter.date = range;
  }

  const entries = await TimeEntry.find(filter).sort({ date: -1, createdAt: -1 })
    .populate('userId', 'name color')
    .populate('projectId', 'name')
    .lean();

  res.json({ entries: entries.map((e) => serializeTimeEntry(e, req.manageUser!.role)) });
});

router.post('/', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = req.manageUser!.userId;

  const date = body.date ? toLocalMidnight(body.date as string) : toLocalMidnight(new Date());
  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }
  const minutes = Number(body.minutes);
  const category = body.category as TimeCategory;
  const projectId = typeof body.projectId === 'string' && Types.ObjectId.isValid(body.projectId)
    ? body.projectId : undefined;

  const invalid = await validateEntry(userId, { date, minutes, category, projectId });
  if (invalid) {
    res.status(400).json(invalid);
    return;
  }

  const { costRateSnapshot, costAmount } = await costFor(userId, minutes);
  const entry = await TimeEntry.create({
    userId,
    date,
    minutes,
    category,
    projectId,
    taskId: typeof body.taskId === 'string' && Types.ObjectId.isValid(body.taskId) ? body.taskId : undefined,
    note: typeof body.note === 'string' ? body.note.trim() : undefined,
    source: 'manual',
    endedAt: new Date(),
    costRateSnapshot,
    costAmount,
    afterProjectClose: await projectClosedFlag(projectId),
  });

  res.status(201).json({ entry: serializeTimeEntry(entry.toObject(), req.manageUser!.role) });
});

router.patch('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const entry = await TimeEntry.findById(String(req.params.id));
  if (!entry) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (String(entry.userId) !== req.manageUser!.userId && req.manageUser!.role !== 'owner') {
    res.status(403).json({ error: 'not_your_entry' });
    return;
  }
  if (entry.locked && req.manageUser!.role !== 'owner') {
    res.status(400).json({ error: 'entry_locked' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const date = body.date ? toLocalMidnight(body.date as string) : entry.date;
  const minutes = body.minutes !== undefined ? Number(body.minutes) : entry.minutes;
  const category = (body.category as TimeCategory) ?? entry.category;
  const projectId = body.projectId === null || body.projectId === ''
    ? undefined
    : (typeof body.projectId === 'string' && Types.ObjectId.isValid(body.projectId)
      ? body.projectId
      : entry.projectId && String(entry.projectId));

  const invalid = await validateEntry(String(entry.userId), { date, minutes, category, projectId }, String(entry._id));
  if (invalid) {
    res.status(400).json(invalid);
    return;
  }

  entry.date = date;
  entry.minutes = minutes;
  entry.category = category;
  entry.projectId = projectId ? new Types.ObjectId(projectId) : undefined;
  if (typeof body.note === 'string') entry.note = body.note.trim();
  entry.costAmount = round2((minutes / 60) * entry.costRateSnapshot);
  await entry.save();

  res.json({ entry: serializeTimeEntry(entry.toObject(), req.manageUser!.role) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const entry = await TimeEntry.findById(String(req.params.id));
  if (!entry) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (String(entry.userId) !== req.manageUser!.userId && req.manageUser!.role !== 'owner') {
    res.status(403).json({ error: 'not_your_entry' });
    return;
  }
  if (entry.locked && req.manageUser!.role !== 'owner') {
    res.status(400).json({ error: 'entry_locked' });
    return;
  }
  await entry.deleteOne();
  res.json({ ok: true });
});

router.get('/week/:startDate', async (req: Request, res: Response) => {
  const given = toLocalMidnight(String(req.params.startDate));
  if (Number.isNaN(given.getTime())) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }
  const start = new Date(given);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const requested = (req.query.userId as string) || req.manageUser!.userId;
  const userId = req.manageUser!.role === 'member' ? req.manageUser!.userId : requested;

  const entries = await TimeEntry.find({
    userId,
    endedAt: { $ne: null },
    date: { $gte: start, $lte: endOfDay(end) },
  }).sort({ date: 1, createdAt: 1 }).populate('projectId', 'name').lean();

  const days: { date: string; minutes: number; entries: unknown[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayEntries = entries.filter((e) => toLocalMidnight(e.date).getTime() === d.getTime());
    days.push({
      date: d.toISOString(),
      minutes: dayEntries.reduce((a, e) => a + e.minutes, 0),
      entries: dayEntries.map((e) => serializeTimeEntry(e, req.manageUser!.role)),
    });
  }

  res.json({
    start: start.toISOString(),
    userId,
    days,
    totalMinutes: days.reduce((a, d) => a + d.minutes, 0),
  });
});

router.get('/month/:month', async (req: Request, res: Response) => {
  const m = String(req.params.month).match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    res.status(400).json({ error: 'invalid_month', detail: { expected: 'YYYY-MM' } });
    return;
  }
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    res.status(400).json({ error: 'invalid_month', detail: { expected: 'YYYY-MM' } });
    return;
  }

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  const requested = (req.query.userId as string) || req.manageUser!.userId;
  const userId = req.manageUser!.role === 'member' ? req.manageUser!.userId : requested;

  const entries = await TimeEntry.find({
    userId,
    endedAt: { $ne: null },
    date: { $gte: start, $lte: endOfDay(end) },
  }).sort({ date: 1, createdAt: 1 }).populate('projectId', 'name').lean();

  const days: { date: string; minutes: number; entries: unknown[] }[] = [];
  for (let d = 1; d <= end.getDate(); d++) {
    const day = new Date(year, monthIndex, d);
    const dayEntries = entries.filter((e) => toLocalMidnight(e.date).getTime() === day.getTime());
    days.push({
      date: day.toISOString(),
      minutes: dayEntries.reduce((a, e) => a + e.minutes, 0),
      entries: dayEntries.map((e) => serializeTimeEntry(e, req.manageUser!.role)),
    });
  }

  res.json({
    month: `${m[1]}-${m[2]}`,
    userId,
    days,
    totalMinutes: days.reduce((a, d) => a + d.minutes, 0),
    daysWorked: days.filter((d) => d.minutes > 0).length,
  });
});

router.post('/lock', requireManageRole('owner'), async (req: Request, res: Response) => {
  const { from, to, locked } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof from !== 'string' || typeof to !== 'string') {
    res.status(400).json({ error: 'from_and_to_required' });
    return;
  }
  const result = await TimeEntry.updateMany(
    { date: { $gte: toLocalMidnight(from), $lte: endOfDay(toLocalMidnight(to)) } },
    { $set: { locked: locked !== false } },
  );
  res.json({ ok: true, updated: result.modifiedCount });
});

export default router;
