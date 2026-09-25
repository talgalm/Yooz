import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage } from '../middleware/manageAuth';
import { Task } from '../models/manage/Task';
import { Project } from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { Interaction } from '../models/manage/Interaction';
import { taskVisibility } from '../utils/taskVisibility';

const router = Router();
router.use(authenticateManage);

export type CalendarKind =
  | 'task_due' | 'meeting' | 'next_action'
  | 'project_start' | 'project_target' | 'project_go_live';

export interface CalendarEvent {
  date: string;
  kind: CalendarKind;
  title: string;
  entityType: string;
  entityId: string;
  href: string;
  color?: string;
}

router.get('/', async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const start = from ? new Date(from) : new Date();
  const end = to ? new Date(to) : new Date(start.getFullYear(), start.getMonth() + 1, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    res.status(400).json({ error: 'invalid_range' });
    return;
  }
  end.setHours(23, 59, 59, 999);
  const range = { $gte: start, $lte: end };

  const { role, userId } = req.manageUser!;
  const mine = new Types.ObjectId(userId);
  const isMember = role === 'member';

  const taskFilter: Record<string, unknown> = {
    archived: false, dueDate: range, ...taskVisibility(req.manageUser!),
  };

  const projectFilter: Record<string, unknown> = { archived: false };
  if (isMember) projectFilter.$or = [{ memberUserIds: mine }, { pmUserId: mine }];

  const [tasks, projects, interactions, clients] = await Promise.all([
    Task.find(taskFilter).select('title dueDate status projectId assigneeUserId')
      .populate('projectId', 'name').populate('assigneeUserId', 'name color').lean(),
    Project.find({
      ...projectFilter,
      $and: [{
        $or: [{ startDate: range }, { targetDate: range }, { goLiveDate: range }],
      }],
    }).select('name startDate targetDate goLiveDate').lean(),
    Interaction.find({ date: range }).select('type date summary clientId').populate('clientId', 'name').lean(),
    isMember ? [] : Client.find({ archived: false, nextActionDate: range })
      .select('name nextActionText nextActionDate').lean(),
  ]);

  const events: CalendarEvent[] = [];

  for (const t of tasks) {
    const assignee = t.assigneeUserId as unknown as { name?: string; color?: string } | undefined;
    events.push({
      date: new Date(t.dueDate!).toISOString(),
      kind: 'task_due',
      title: assignee?.name ? `${t.title} · ${assignee.name}` : t.title,
      entityType: 'task',
      entityId: String(t._id),
      href: `/manage/tasks?task=${t._id}`,
      color: assignee?.color,
    });
  }

  for (const p of projects) {
    const marks: [Date | undefined, CalendarKind][] = [
      [p.startDate, 'project_start'],
      [p.targetDate, 'project_target'],
      [p.goLiveDate, 'project_go_live'],
    ];
    for (const [date, kind] of marks) {
      if (!date) continue;
      const d = new Date(date);
      if (d < start || d > end) continue;
      events.push({
        date: d.toISOString(),
        kind,
        title: p.name,
        entityType: 'project',
        entityId: String(p._id),
        href: `/manage/projects/${p._id}`,
      });
    }
  }

  for (const i of interactions) {
    const client = i.clientId as unknown as { _id: Types.ObjectId; name: string } | undefined;
    events.push({
      date: new Date(i.date).toISOString(),
      kind: 'meeting',
      title: `${client?.name ?? ''}: ${i.summary}`.trim(),
      entityType: 'client',
      entityId: String(client?._id ?? ''),
      href: client ? `/manage/clients/${client._id}` : '/manage/clients',
    });
  }

  for (const c of clients as { _id: Types.ObjectId; name: string; nextActionText?: string; nextActionDate: Date }[]) {
    events.push({
      date: new Date(c.nextActionDate).toISOString(),
      kind: 'next_action',
      title: `${c.name}: ${c.nextActionText ?? ''}`.trim(),
      entityType: 'client',
      entityId: String(c._id),
      href: `/manage/clients/${c._id}`,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  res.json({ from: start.toISOString(), to: end.toISOString(), events });
});

export default router;
