import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage } from '../middleware/manageAuth';
import { Task, TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority, PRIORITY_RANK } from '../models/manage/Task';
import { ManageUser } from '../models/manage/ManageUser';
import { taskVisibility } from '../utils/taskVisibility';

const router = Router();
router.use(authenticateManage);

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'Invalid id' });
  return true;
}

function visibilityFilter(req: Request): Record<string, unknown> {
  return taskVisibility(req.manageUser!);
}

function pickTaskFields(body: Record<string, unknown>, role: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['title', 'description', 'stageKey', 'plannedWeek']) {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).trim();
  }
  if (TASK_PRIORITIES.includes(body.priority as TaskPriority)) out.priority = body.priority;
  if (typeof body.plannedHours === 'number' && body.plannedHours >= 0) out.plannedHours = body.plannedHours;
  if (typeof body.archived === 'boolean') out.archived = body.archived;
  // Publishing a task to the whole team is a management call, not a member's.
  if (typeof body.visibleToAll === 'boolean' && (role === 'owner' || role === 'pm')) {
    out.visibleToAll = body.visibleToAll;
  }

  for (const k of ['startDate', 'dueDate']) {
    if (body[k] === null || body[k] === '') out[k] = undefined;
    else if (typeof body[k] === 'string') {
      const d = new Date(body[k] as string);
      if (!Number.isNaN(d.getTime())) out[k] = d;
    }
  }
  for (const k of ['projectId', 'clientId', 'assigneeUserId']) {
    if (body[k] === null || body[k] === '') out[k] = undefined;
    else if (typeof body[k] === 'string' && Types.ObjectId.isValid(body[k] as string)) out[k] = body[k];
  }
  if (Array.isArray(body.watcherUserIds)) {
    out.watcherUserIds = (body.watcherUserIds as unknown[])
      .filter((x) => typeof x === 'string' && Types.ObjectId.isValid(x));
  }
  if (Array.isArray(body.checklist)) {
    out.checklist = (body.checklist as { text?: unknown; done?: unknown }[])
      .filter((c) => typeof c?.text === 'string')
      .map((c) => ({ text: String(c.text).trim(), done: !!c.done }));
  }
  return out;
}

// ─── Tasks ───

router.get('/', async (req: Request, res: Response) => {
  const { status, priority, assigneeUserId, projectId, clientId, needsOwner, scope, overdue } =
    req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...visibilityFilter(req), archived: false };
  if (status && TASK_STATUSES.includes(status as TaskStatus)) filter.status = status;
  else if (scope === 'open') filter.status = { $ne: 'done' };
  if (priority && TASK_PRIORITIES.includes(priority as TaskPriority)) filter.priority = priority;
  if (assigneeUserId && Types.ObjectId.isValid(assigneeUserId)) filter.assigneeUserId = assigneeUserId;
  if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
  if (clientId && Types.ObjectId.isValid(clientId)) filter.clientId = clientId;
  if (needsOwner === 'true') filter.needsOwner = true;
  // Tasks with no project at all — the standalone todo list.
  if (scope === 'standalone') filter.projectId = { $exists: false };
  if (overdue === 'true') {
    const t = new Date();
    filter.dueDate = { $lt: new Date(t.getFullYear(), t.getMonth(), t.getDate()) };
    filter.status = { $ne: 'done' };
  }

  const tasks = await Task.find(filter)
    .populate('assigneeUserId', 'name color')
    .populate('projectId', 'name')
    .populate('clientId', 'name')
    .lean();

  // Sorted in code, not Mongo: priority is a string enum whose alphabetical
  // order is meaningless ("high" < "low" < "normal" < "urgent").
  tasks.sort((a, b) => {
    if (a.needsOwner !== b.needsOwner) return a.needsOwner ? -1 : 1;
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return ad - bd;
  });

  res.json({ tasks });
});

/** The owner's action queue: everything flagged as needing a decision. */
router.get('/needs-owner', async (req: Request, res: Response) => {
  const tasks = await Task.find({ needsOwner: true, archived: false, status: { $ne: 'done' } })
    .populate('assigneeUserId', 'name color')
    .populate('projectId', 'name')
    .sort({ needsOwnerSince: 1 })
    .lean();
  res.json({ tasks });
});

router.post('/', async (req: Request, res: Response) => {
  const { role, userId } = req.manageUser!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fields = pickTaskFields(body, role);
  if (!fields.title) {
    res.status(400).json({ error: 'title_required' });
    return;
  }
  // A member creates work for themselves only; owner and pm assign to anyone.
  if (role === 'member') fields.assigneeUserId = userId;
  const task = await Task.create({
    ...fields,
    // Unassigned work is nobody's work — default it to whoever created it.
    assigneeUserId: fields.assigneeUserId ?? userId,
    createdBy: req.manageUser!.userId,
  });
  res.status(201).json({ task });
});

router.get('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const task = await Task.findOne({ _id: String(req.params.id), ...visibilityFilter(req) })
    .populate('assigneeUserId', 'name color')
    .populate('projectId', 'name')
    .populate('clientId', 'name')
    .populate('comments.userId', 'name color')
    .lean();
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ task });
});

router.patch('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const { role } = req.manageUser!;
  // Same gate as reading it: you cannot edit a task you are not allowed to see.
  const task = await Task.findOne({ _id: String(req.params.id), ...visibilityFilter(req) });
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const fields = pickTaskFields(body, role);
  // A member cannot hand their task to someone else, or take someone else's.
  if (role === 'member') delete fields.assigneeUserId;
  Object.assign(task, fields);

  if (typeof body.status === 'string' && TASK_STATUSES.includes(body.status as TaskStatus)) {
    const next = body.status as TaskStatus;
    // completedAt is stamped, never sent — it is what "finished late" is measured from.
    if (next === 'done' && task.status !== 'done') task.completedAt = new Date();
    if (next !== 'done') task.completedAt = undefined;
    task.status = next;
  }

  /**
   * The decision flag. Raising it stamps the clock; lowering it stamps the
   * resolution and STOPS the clock — without both timestamps the dashboard
   * cannot say how long anyone actually waited.
   */
  if (typeof body.needsOwner === 'boolean' && body.needsOwner !== task.needsOwner) {
    if (body.needsOwner) {
      task.needsOwner = true;
      task.needsOwnerSince = new Date();
      task.needsOwnerResolvedAt = undefined;
      if (typeof body.needsOwnerReason === 'string') task.needsOwnerReason = body.needsOwnerReason.trim();
    } else {
      task.needsOwner = false;
      task.needsOwnerResolvedAt = new Date();
    }
  } else if (task.needsOwner && typeof body.needsOwnerReason === 'string') {
    task.needsOwnerReason = body.needsOwnerReason.trim();
  }

  await task.save();
  res.json({ task });
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const task = await Task.findById(String(req.params.id));
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const { role, userId } = req.manageUser!;
  if (role === 'member' && String(task.assigneeUserId) !== userId && String(task.createdBy) !== userId) {
    res.status(403).json({ error: 'not_your_task' });
    return;
  }
  await task.deleteOne();
  res.json({ ok: true });
});

// ─── Comments ───

router.post('/:id/comments', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const text = (req.body ?? {}).text;
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text_required' });
    return;
  }
  const task = await Task.findById(String(req.params.id));
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  task.comments.push({ userId: new Types.ObjectId(req.manageUser!.userId), text: text.trim() } as never);
  await task.save();

  const populated = await Task.findById(task._id).populate('comments.userId', 'name color').lean();
  res.status(201).json({ task: populated });
});

router.delete('/:id/comments/:commentId', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id)) || badId(res, String(req.params.commentId))) return;
  const task = await Task.findById(String(req.params.id));
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const comment = task.comments.find((c) => String(c._id) === String(req.params.commentId));
  if (!comment) {
    res.status(404).json({ error: 'comment_not_found' });
    return;
  }
  // You delete your own words; the owner can delete anyone's.
  if (String(comment.userId) !== req.manageUser!.userId && req.manageUser!.role !== 'owner') {
    res.status(403).json({ error: 'not_your_comment' });
    return;
  }
  task.comments = task.comments.filter((c) => String(c._id) !== String(req.params.commentId)) as never;
  await task.save();
  res.json({ task });
});

export default router;
