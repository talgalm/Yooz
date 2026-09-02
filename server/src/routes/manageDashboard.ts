import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage } from '../middleware/manageAuth';
import { Task } from '../models/manage/Task';
import { Project } from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { TimeEntry } from '../models/manage/TimeEntry';
import { buildAlerts } from '../services/manageAlerts';

const router = Router();
router.use(authenticateManage);

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * The whole dashboard in ONE request. Spec ch.06: "the dashboard loads in a
 * single network call" — a screen assembled from eight requests is a screen
 * that shows eight different loading states and lies during four of them.
 */
router.get('/', async (req: Request, res: Response) => {
  const { role, userId } = req.manageUser!;
  const mine = new Types.ObjectId(userId);
  const today = startOfToday();
  const isMember = role === 'member';

  const alerts = await buildAlerts({ userId, role });

  // My own open work, always scoped to the requester.
  const myTaskFilter = { assigneeUserId: mine, archived: false, status: { $ne: 'done' } };
  const [myOpenTasks, myOverdueTasks, myNeedsOwner] = await Promise.all([
    Task.countDocuments(myTaskFilter),
    Task.countDocuments({ ...myTaskFilter, dueDate: { $lt: today } }),
    Task.countDocuments({ assigneeUserId: mine, needsOwner: true, archived: false, status: { $ne: 'done' } }),
  ]);

  // Hours logged this week by the requester.
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const [weekAgg] = await TimeEntry.aggregate<{ total: number }>([
    { $match: { userId: mine, endedAt: { $ne: null }, date: { $gte: weekStart } } },
    { $group: { _id: null, total: { $sum: '$minutes' } } },
  ]);

  const mySummary = {
    openTasks: myOpenTasks,
    overdueTasks: myOverdueTasks,
    needsOwner: myNeedsOwner,
    weekHours: Math.round(((weekAgg?.total ?? 0) / 60) * 10) / 10,
  };

  if (isMember) {
    res.json({ role, alerts, my: mySummary });
    return;
  }

  // pm and owner also get the business view.
  const [activeProjects, health, decisionQueue, staleClients, openTasksAll] = await Promise.all([
    Project.countDocuments({ archived: false, status: { $in: ['active', 'maintenance'] } }),
    Project.aggregate<{ _id: string; n: number }>([
      { $match: { archived: false, status: { $nin: ['done', 'cancelled'] } } },
      { $group: { _id: '$health', n: { $sum: 1 } } },
    ]),
    Task.find({ needsOwner: true, archived: false, status: { $ne: 'done' } })
      .select('title needsOwnerSince assigneeUserId projectId')
      .populate('assigneeUserId', 'name color')
      .populate('projectId', 'name')
      .sort({ needsOwnerSince: 1 })
      .lean(),
    Client.countDocuments({ archived: false, status: 'active' }),
    Task.countDocuments({ archived: false, status: { $ne: 'done' } }),
  ]);

  const healthCounts = { green: 0, orange: 0, red: 0 };
  for (const h of health) {
    if (h._id in healthCounts) healthCounts[h._id as keyof typeof healthCounts] = h.n;
  }

  res.json({
    role,
    alerts,
    my: mySummary,
    business: {
      activeProjects,
      health: healthCounts,
      activeClients: staleClients,
      openTasks: openTasksAll,
      // "What is waiting for me" — the table the brief asked for by name.
      decisionQueue: decisionQueue.map((t) => ({
        _id: t._id,
        title: t.title,
        assignee: t.assigneeUserId,
        project: t.projectId,
        since: t.needsOwnerSince,
        waitingDays: t.needsOwnerSince
          ? Math.floor((today.getTime() - new Date(t.needsOwnerSince).setHours(0, 0, 0, 0)) / 86_400_000)
          : 0,
      })),
    },
  });
});

export default router;
