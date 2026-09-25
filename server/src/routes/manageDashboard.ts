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

router.get('/', async (req: Request, res: Response) => {
  const { role, userId } = req.manageUser!;
  const mine = new Types.ObjectId(userId);
  const today = startOfToday();
  const isMember = role === 'member';

  const alerts = await buildAlerts({ userId, role });

  const myTaskFilter = { assigneeUserId: mine, archived: false, status: { $ne: 'done' } };
  const [myOpenTasks, myOverdueTasks] = await Promise.all([
    Task.countDocuments(myTaskFilter),
    Task.countDocuments({ ...myTaskFilter, dueDate: { $lt: today } }),
  ]);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const [weekAgg] = await TimeEntry.aggregate<{ total: number }>([
    { $match: { userId: mine, endedAt: { $ne: null }, date: { $gte: weekStart } } },
    { $group: { _id: null, total: { $sum: '$minutes' } } },
  ]);

  const mySummary = {
    openTasks: myOpenTasks,
    overdueTasks: myOverdueTasks,
    weekHours: Math.round(((weekAgg?.total ?? 0) / 60) * 10) / 10,
  };

  if (isMember) {
    res.json({ role, alerts, my: mySummary });
    return;
  }

  const [activeProjects, health, staleClients, openTasksAll] = await Promise.all([
    Project.countDocuments({ archived: false, status: { $in: ['active', 'maintenance'] } }),
    Project.aggregate<{ _id: string; n: number }>([
      { $match: { archived: false, status: { $nin: ['done', 'cancelled'] } } },
      { $group: { _id: '$health', n: { $sum: 1 } } },
    ]),
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
    },
  });
});

export default router;
