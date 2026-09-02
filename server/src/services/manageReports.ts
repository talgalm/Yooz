/**
 * The six fixed reports — spec ch.06 §14.
 *
 * Each takes a date range. Money-bearing figures are only ever assembled when
 * the caller is the owner; the route decides, these functions just take a flag
 * so there is one code path rather than two that can drift.
 */
import { Types } from 'mongoose';
import { TimeEntry, TIME_CATEGORIES } from '../models/manage/TimeEntry';
import { Task } from '../models/manage/Task';
import { Project } from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { Interaction } from '../models/manage/Interaction';
import { ManageUser } from '../models/manage/ManageUser';
import { round1, round2 } from './manageMetrics';
import {
  projectMoney, laborCostByProject, expenseTotalByProject, changeRequestRevenueByProject,
} from './manageMoney';

export interface Range { from: Date; to: Date }

const hours = (minutes: number) => round1(minutes / 60);

/** 1. Where the business's time actually went. */
export async function hoursByCategory({ from, to }: Range) {
  const rows = await TimeEntry.aggregate<{ _id: string; minutes: number }>([
    { $match: { endedAt: { $ne: null }, date: { $gte: from, $lte: to } } },
    { $group: { _id: '$category', minutes: { $sum: '$minutes' } } },
  ]);
  const byKey = Object.fromEntries(rows.map((r) => [r._id, r.minutes]));
  const totalMinutes = rows.reduce((a, r) => a + r.minutes, 0);

  return TIME_CATEGORIES.map((category) => {
    const minutes = byKey[category] ?? 0;
    return {
      category,
      hours: hours(minutes),
      // Share of the period, so "how much of us is client work" is answerable.
      share: totalMinutes > 0 ? round2(minutes / totalMinutes) : 0,
    };
  }).filter((r) => r.hours > 0);
}

/** 2. Hours per employee, split by project. */
export async function hoursByUser({ from, to }: Range, includeMoney: boolean) {
  const rows = await TimeEntry.aggregate<{
    _id: { userId: Types.ObjectId; projectId: Types.ObjectId | null };
    minutes: number; cost: number;
  }>([
    { $match: { endedAt: { $ne: null }, date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { userId: '$userId', projectId: '$projectId' },
        minutes: { $sum: '$minutes' },
        cost: { $sum: '$costAmount' },
      },
    },
  ]);

  const [users, projects] = await Promise.all([
    ManageUser.find({}).select('name role').lean(),
    Project.find({}).select('name').lean(),
  ]);
  const userName = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
  const projectName = Object.fromEntries(projects.map((p) => [String(p._id), p.name]));

  const byUser = new Map<string, { userId: string; name: string; hours: number; cost: number; projects: { name: string; hours: number }[] }>();
  for (const r of rows) {
    const uid = String(r._id.userId);
    const entry = byUser.get(uid) ?? { userId: uid, name: userName[uid] ?? '—', hours: 0, cost: 0, projects: [] };
    entry.hours = round1(entry.hours + r.minutes / 60);
    entry.cost = round2(entry.cost + r.cost);
    entry.projects.push({
      name: r._id.projectId ? (projectName[String(r._id.projectId)] ?? '—') : '—',
      hours: hours(r.minutes),
    });
    byUser.set(uid, entry);
  }

  return [...byUser.values()]
    .map((u) => ({ ...u, cost: includeMoney ? u.cost : undefined }))
    .sort((a, b) => b.hours - a.hours);
}

/** 3. Which projects ate the most time. */
export async function hoursByProject({ from, to }: Range, includeMoney: boolean) {
  const rows = await TimeEntry.aggregate<{ _id: Types.ObjectId | null; minutes: number; cost: number }>([
    { $match: { endedAt: { $ne: null }, date: { $gte: from, $lte: to } } },
    { $group: { _id: '$projectId', minutes: { $sum: '$minutes' }, cost: { $sum: '$costAmount' } } },
  ]);

  const projects = await Project.find({}).select('name type plannedHours clientId').lean();
  const byId = Object.fromEntries(projects.map((p) => [String(p._id), p]));
  const clients = await Client.find({}).select('name').lean();
  const clientName = Object.fromEntries(clients.map((c) => [String(c._id), c.name]));

  return rows
    .map((r) => {
      const p = r._id ? byId[String(r._id)] : undefined;
      return {
        projectId: r._id ? String(r._id) : null,
        name: p?.name ?? '—',
        type: p?.type ?? '—',
        clientName: p?.clientId ? clientName[String(p.clientId)] : undefined,
        plannedHours: p?.plannedHours ?? 0,
        hours: hours(r.minutes),
        cost: includeMoney ? round2(r.cost) : undefined,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

/**
 * 4. Estimate vs actual per stage, over finished projects.
 *
 * The report that improves pricing over time — worth a look once a quarter.
 * Actual hours reach a stage through the task they were logged against, so a
 * time entry with no task cannot be attributed and is deliberately left out
 * rather than smeared across stages.
 */
export async function estimateVsActual() {
  const projects = await Project.find({ status: { $in: ['done', 'maintenance'] } })
    .select('name stages').lean();
  if (projects.length === 0) return { stages: [], projectCount: 0 };

  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ projectId: { $in: projectIds } }).select('stageKey').lean();
  const stageOfTask = Object.fromEntries(tasks.map((t) => [String(t._id), t.stageKey]));

  const entries = await TimeEntry.find({ projectId: { $in: projectIds }, endedAt: { $ne: null } })
    .select('projectId taskId minutes').lean();

  // projectId -> stageKey -> actual minutes
  const actual = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const stageKey = e.taskId ? stageOfTask[String(e.taskId)] : undefined;
    if (!stageKey) continue;
    const perProject = actual.get(String(e.projectId)) ?? new Map<string, number>();
    perProject.set(stageKey, (perProject.get(stageKey) ?? 0) + e.minutes);
    actual.set(String(e.projectId), perProject);
  }

  const agg = new Map<string, { key: string; name: string; planned: number; actual: number; samples: number }>();
  for (const p of projects) {
    const perProject = actual.get(String(p._id));
    for (const stage of p.stages ?? []) {
      const actualHours = round1((perProject?.get(stage.key) ?? 0) / 60);
      // A stage nobody logged against tells us nothing about estimate quality.
      if (actualHours === 0 && stage.plannedHours === 0) continue;
      const row = agg.get(stage.key) ?? { key: stage.key, name: stage.name, planned: 0, actual: 0, samples: 0 };
      row.planned = round1(row.planned + stage.plannedHours);
      row.actual = round1(row.actual + actualHours);
      row.samples += 1;
      agg.set(stage.key, row);
    }
  }

  return {
    projectCount: projects.length,
    stages: [...agg.values()].map((r) => ({
      ...r,
      // Positive means it took longer than estimated.
      deviation: r.planned > 0 ? round2((r.actual - r.planned) / r.planned) : 0,
    })),
  };
}

/** 5. Revenue, cost and profit per client. Owner only. */
export async function profitabilityByClient() {
  const projects = await Project.find({ archived: false, type: 'client' }).lean();
  const ids = projects.map((p) => String(p._id));
  const [labor, expenses, crRevenue, clients] = await Promise.all([
    laborCostByProject(ids),
    expenseTotalByProject(ids),
    changeRequestRevenueByProject(ids),
    Client.find({}).select('name').lean(),
  ]);
  const clientName = Object.fromEntries(clients.map((c) => [String(c._id), c.name]));

  const byClient = new Map<string, { clientId: string; name: string; revenue: number; cost: number; profit: number; projects: number }>();
  for (const p of projects) {
    const id = String(p._id);
    const money = projectMoney(p as never, {
      laborCost: labor[id] ?? 0,
      expenseTotal: expenses[id] ?? 0,
      changeRequestRevenue: crRevenue[id] ?? 0,
      actualHours: 0,
    });
    const cid = p.clientId ? String(p.clientId) : 'none';
    const row = byClient.get(cid)
      ?? { clientId: cid, name: p.clientId ? (clientName[cid] ?? '—') : '—', revenue: 0, cost: 0, profit: 0, projects: 0 };
    row.revenue = round2(row.revenue + money.revenue);
    row.cost = round2(row.cost + money.totalCost);
    row.profit = round2(row.profit + money.grossProfit);
    row.projects += 1;
    byClient.set(cid, row);
  }

  return [...byClient.values()]
    .map((r) => ({ ...r, margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 10000 : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

/** 6. Who we have and have not been talking to. */
export async function clientActivity({ from, to }: Range) {
  const clients = await Client.find({ archived: false }).select('name status lastContactDate').lean();
  const counts = await Interaction.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: '$clientId', n: { $sum: 1 } } },
  ]);
  const byClient = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  const today = new Date();

  return clients
    .map((c) => ({
      clientId: String(c._id),
      name: c.name,
      status: c.status,
      lastContactDate: c.lastContactDate,
      daysSinceContact: c.lastContactDate
        ? Math.floor((today.getTime() - new Date(c.lastContactDate).getTime()) / 86_400_000)
        : null,
      interactions: byClient[String(c._id)] ?? 0,
    }))
    // Quietest first — the point of the report is who is being forgotten.
    .sort((a, b) => (b.daysSinceContact ?? Infinity) - (a.daysSinceContact ?? Infinity));
}
