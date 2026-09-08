import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import {
  Project, PROJECT_TYPES, PROJECT_STATUSES, STAGE_STATUSES,
  ProjectType, ProjectStatus, StageStatus,
} from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { ManageUser } from '../models/manage/ManageUser';
import { Task } from '../models/manage/Task';
import { serializeProject } from '../serializers/manageProject';
import {
  buildStages, canTransition, projectHealth, projectHours,
  actualHours, actualHoursByProject,
} from '../services/manageMetrics';
import { getSettings } from '../services/manageSettings';

const router = Router();
router.use(authenticateManage);

const canEdit = requireManageRole('owner', 'pm');

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'Invalid id' });
  return true;
}

/**
 * A member sees only projects they are on; pm and owner see everything.
 * This is a query filter, not a UI filter — a member hitting the API directly
 * gets the same restricted set.
 */
function visibilityFilter(req: Request): Record<string, unknown> {
  const { role, userId } = req.manageUser!;
  if (role === 'owner' || role === 'pm') return {};
  return { $or: [{ memberUserIds: userId }, { pmUserId: userId }, { type: 'internal' }] };
}

function pickProjectFields(body: Record<string, unknown>, role: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['name', 'description', 'driveUrl']) {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).trim();
  }
  if (PROJECT_TYPES.includes(body.type as ProjectType)) out.type = body.type;
  if (Array.isArray(body.tags)) out.tags = (body.tags as unknown[]).filter((t) => typeof t === 'string');
  if (typeof body.archived === 'boolean') out.archived = body.archived;
  if (typeof body.plannedHours === 'number' && body.plannedHours >= 0) out.plannedHours = body.plannedHours;

  for (const k of ['startDate', 'targetDate', 'goLiveDate']) {
    if (body[k] === null || body[k] === '') out[k] = undefined;
    else if (typeof body[k] === 'string') {
      const d = new Date(body[k] as string);
      if (!Number.isNaN(d.getTime())) out[k] = d;
    }
  }

  for (const k of ['clientId', 'primaryContactId', 'pmUserId']) {
    if (body[k] === null || body[k] === '') out[k] = undefined;
    else if (typeof body[k] === 'string' && Types.ObjectId.isValid(body[k] as string)) out[k] = body[k];
  }
  if (Array.isArray(body.memberUserIds)) {
    out.memberUserIds = (body.memberUserIds as unknown[])
      .filter((x) => typeof x === 'string' && Types.ObjectId.isValid(x));
  }

  // Money is owner-only on the way IN as well as on the way out. A pm who posts
  // agreedPrice must not be able to set it just because the field is unguarded.
  if (role === 'owner') {
    if (typeof body.agreedPrice === 'number' && body.agreedPrice >= 0) out.agreedPrice = body.agreedPrice;
    if (typeof body.recurring === 'object' && body.recurring !== null) {
      const r = body.recurring as Record<string, unknown>;
      out.recurring = {
        enabled: !!r.enabled,
        monthlyAmount: typeof r.monthlyAmount === 'number' ? r.monthlyAmount : 0,
        billingDay: typeof r.billingDay === 'number' ? Math.min(28, Math.max(1, r.billingDay)) : 1,
        startDate: typeof r.startDate === 'string' && r.startDate ? new Date(r.startDate) : undefined,
        endDate: typeof r.endDate === 'string' && r.endDate ? new Date(r.endDate) : undefined,
        autoRenew: !!r.autoRenew,
      };
    }
  }
  return out;
}

// ─── Templates (read-only until the Settings screen exists) ───

router.get('/stage-template', async (_req: Request, res: Response) => {
  res.json({ template: (await getSettings()).stageTemplate });
});

// ─── Projects ───

router.get('/', async (req: Request, res: Response) => {
  const { status, type, clientId, health, billing, q, archived } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { ...visibilityFilter(req), archived: archived === 'true' };

  if (status && PROJECT_STATUSES.includes(status as ProjectStatus)) filter.status = status;
  if (type && PROJECT_TYPES.includes(type as ProjectType)) filter.type = type;
  if (health && ['green', 'orange', 'red'].includes(health)) filter.health = health;
  if (clientId && Types.ObjectId.isValid(clientId)) filter.clientId = clientId;
  // The one-off vs retainer split the brief asked for — reuses recurring.enabled.
  if (billing === 'recurring') filter['recurring.enabled'] = true;
  if (billing === 'one_time') filter['recurring.enabled'] = false;
  if (q && q.trim()) {
    const rx = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: rx, $options: 'i' };
  }

  const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
  const clientIds = projects.map((p) => p.clientId).filter((x): x is Types.ObjectId => !!x);
  const clients = await Client.find({ _id: { $in: clientIds } }).select('name').lean();
  const clientNames = Object.fromEntries(clients.map((c) => [String(c._id), c.name]));
  const hoursById = await actualHoursByProject(projects.map((p) => p._id));

  res.json({
    projects: projects.map((p) => ({
      ...serializeProject(p as never, req.manageUser!.role),
      clientName: p.clientId ? clientNames[String(p.clientId)] : undefined,
      hours: projectHours(p as never, hoursById[String(p._id)] ?? 0),
    })),
  });
});

router.post('/', canEdit, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fields = pickProjectFields(body, req.manageUser!.role);

  if (!fields.name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  const type = (fields.type as ProjectType) ?? 'client';
  // Internal work and sales demos have no client — that is the whole point of
  // the type field, so do not require one for them.
  if (type === 'client' && !fields.clientId) {
    res.status(400).json({ error: 'A client project needs a client' });
    return;
  }

  const plannedHours = (fields.plannedHours as number) ?? 0;

  const settings = await getSettings();
  const project = await Project.create({
    ...fields,
    type,
    stages: buildStages(plannedHours, settings.stageTemplate),
    pmUserId: fields.pmUserId ?? req.manageUser!.userId,
    createdBy: req.manageUser!.userId,
  });

  const { health, healthReason } = projectHealth(project, 0, new Date(), 0, settings.thresholds);
  project.health = health;
  project.healthReason = healthReason;
  await project.save();

  res.status(201).json({ project: serializeProject(project, req.manageUser!.role) });
});

router.get('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const project = await Project.findOne({ _id: String(req.params.id), ...visibilityFilter(req) }).lean();
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const client = project.clientId ? await Client.findById(project.clientId).select('name contacts').lean() : null;
  const team = await ManageUser.find({
    _id: { $in: [project.pmUserId, ...(project.memberUserIds ?? [])] },
  }).select('name color role').lean();

  res.json({
    project: serializeProject(project as never, req.manageUser!.role),
    hours: projectHours(project as never, await actualHours(project._id)),
    client: client ? { _id: client._id, name: client.name, contacts: client.contacts } : null,
    team,
  });
});

router.patch('/:id', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const project = await Project.findById(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const fields = pickProjectFields(body, req.manageUser!.role);

  // Status is handled separately because it carries rules.
  if (typeof body.status === 'string' && PROJECT_STATUSES.includes(body.status as ProjectStatus)) {
    const next = body.status as ProjectStatus;
    if (!canTransition(project.status, next)) {
      res.status(400).json({ error: `Cannot move a project from ${project.status} to ${next}` });
      return;
    }
    // The spec's one hard gate: nothing is "done" without a go-live date.
    const goLive = (fields.goLiveDate as Date | undefined) ?? project.goLiveDate;
    if (next === 'done' && !goLive) {
      res.status(400).json({ error: 'needs_go_live_date' });
      return;
    }
    if ((next === 'done' || next === 'cancelled') && !project.closedAt) project.closedAt = new Date();
    if (next !== 'done' && next !== 'cancelled') project.closedAt = undefined;
    project.status = next;
  }

  Object.assign(project, fields);

  // Rebuilding stage hours from a changed budget would wipe manual edits, so the
  // split is only applied when the project has no stages yet.
  if (typeof fields.plannedHours === 'number' && project.stages.length === 0) {
    project.stages = buildStages(fields.plannedHours, (await getSettings()).stageTemplate) as never;
  }

  const overdueTasks = await Task.countDocuments({
    projectId: project._id, archived: false, status: { $ne: 'done' }, dueDate: { $lt: new Date() },
  });
  const { health, healthReason } = projectHealth(
    project, overdueTasks, new Date(), await actualHours(project._id), (await getSettings()).thresholds,
  );
  project.health = health;
  project.healthReason = healthReason;
  await project.save();

  res.json({ project: serializeProject(project, req.manageUser!.role) });
});

router.delete('/:id', requireManageRole('owner'), async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const project = await Project.findByIdAndDelete(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ ok: true });
});

// ─── Stages ───

router.patch('/:id/stages/:stageKey', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const project = await Project.findById(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const stage = project.stages.find((s) => s.key === String(req.params.stageKey));
  if (!stage) {
    res.status(404).json({ error: 'Stage not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.plannedHours === 'number' && body.plannedHours >= 0) stage.plannedHours = body.plannedHours;
  for (const k of ['plannedStartDate', 'plannedEndDate'] as const) {
    if (body[k] === null || body[k] === '') stage[k] = undefined;
    else if (typeof body[k] === 'string') {
      const d = new Date(body[k] as string);
      if (!Number.isNaN(d.getTime())) stage[k] = d;
    }
  }

  if (typeof body.status === 'string' && STAGE_STATUSES.includes(body.status as StageStatus)) {
    const next = body.status as StageStatus;
    // startedAt/completedAt are stamped by the transition, never sent by the client.
    // This is what makes planned-vs-actual on the timeline real rather than two planned bars.
    if (next === 'in_progress' && !stage.startedAt) stage.startedAt = new Date();
    if (next === 'done' && !stage.completedAt) stage.completedAt = new Date();
    if (next === 'not_started') { stage.startedAt = undefined; stage.completedAt = undefined; }
    stage.status = next;
    if (next === 'in_progress') project.currentStageKey = stage.key;
  }

  // Total budget stays the sum of its stages, so the two never disagree.
  project.plannedHours = Math.round(project.stages.reduce((a, s) => a + s.plannedHours, 0) * 10) / 10;

  const overdueTasks = await Task.countDocuments({
    projectId: project._id, archived: false, status: { $ne: 'done' }, dueDate: { $lt: new Date() },
  });
  const { health, healthReason } = projectHealth(
    project, overdueTasks, new Date(), await actualHours(project._id), (await getSettings()).thresholds,
  );
  project.health = health;
  project.healthReason = healthReason;
  await project.save();

  res.json({ project: serializeProject(project, req.manageUser!.role) });
});

export default router;
