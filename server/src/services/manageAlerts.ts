import { Types } from 'mongoose';
import { Task, isOpen } from '../models/manage/Task';
import { Project } from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { ManageRole } from '../models/manage/ManageUser';
import { actualHoursByProject } from './manageMetrics';
import { getSettings } from './manageSettings';

export type Severity = 'critical' | 'warning' | 'info';

export interface Alert {
  key: string;
  severity: Severity;
  title: string;
  entityType: string;
  entityId: string;
  href: string;
  ageDays?: number;
  audience: ManageRole[];
}

export const STALE_CLIENT_DAYS = 30;
export const NEEDS_OWNER_CRITICAL_DAYS = 2;

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export async function buildAlerts(
  viewer: { userId: string; role: ManageRole },
  now: Date = new Date(),
): Promise<Alert[]> {
  const today = startOfToday(now);
  const { thresholds } = await getSettings();
  const alerts: Alert[] = [];
  const isMember = viewer.role === 'member';
  const mine = new Types.ObjectId(viewer.userId);

  const taskScope: Record<string, unknown> = { archived: false, status: { $ne: 'done' } };
  if (isMember) taskScope.assigneeUserId = mine;

  const openTasks = await Task.find(taskScope)
    .select('title assigneeUserId projectId dueDate status')
    .lean();

  for (const t of openTasks) {
    const href = `/manage/tasks?task=${t._id}`;

    if (t.dueDate) {
      const due = startOfToday(new Date(t.dueDate));
      const overdueBy = daysBetween(due, today);
      if (overdueBy > 0) {
        alerts.push({
          key: 'task_overdue',
          severity: 'warning',
          title: `משימה באיחור ${overdueBy} ימים: ${t.title}`,
          entityType: 'task',
          entityId: String(t._id),
          href,
          ageDays: overdueBy,
          audience: ['owner', 'pm', 'member'],
        });
      } else if (overdueBy === 0) {
        alerts.push({
          key: 'task_due_today',
          severity: 'info',
          title: `משימה להיום: ${t.title}`,
          entityType: 'task',
          entityId: String(t._id),
          href,
          audience: ['owner', 'pm', 'member'],
        });
      }
    }
  }

  const projectScope: Record<string, unknown> = {
    archived: false,
    status: { $nin: ['done', 'cancelled'] },
  };
  if (isMember) projectScope.$or = [{ memberUserIds: mine }, { pmUserId: mine }];

  const projects = await Project.find(projectScope)
    .select('name plannedHours targetDate status').lean();
  const hoursById = await actualHoursByProject(projects.map((p) => p._id));

  for (const p of projects) {
    const href = `/manage/projects/${p._id}`;
    const actual = hoursById[String(p._id)] ?? 0;
    const utilization = p.plannedHours > 0 ? actual / p.plannedHours : 0;

    if (utilization > thresholds.overBudget) {
      alerts.push({
        key: 'project_over_budget',
        severity: 'critical',
        title: `חריגה מתקציב השעות: ${p.name}`,
        entityType: 'project',
        entityId: String(p._id),
        href,
        audience: ['owner', 'pm'],
      });
    } else if (utilization >= thresholds.nearBudget) {
      alerts.push({
        key: 'project_near_budget',
        severity: 'warning',
        title: `מתקרב לתקציב השעות (${Math.round(utilization * 100)}%): ${p.name}`,
        entityType: 'project',
        entityId: String(p._id),
        href,
        audience: ['owner', 'pm'],
      });
    }

    if (p.targetDate) {
      const overdueBy = daysBetween(startOfToday(new Date(p.targetDate)), today);
      if (overdueBy > 0) {
        alerts.push({
          key: 'project_overdue',
          severity: 'critical',
          title: `פרויקט עבר את תאריך היעד ב-${overdueBy} ימים: ${p.name}`,
          entityType: 'project',
          entityId: String(p._id),
          href,
          ageDays: overdueBy,
          audience: ['owner', 'pm'],
        });
      }
    }
  }

  if (!isMember) {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - thresholds.staleClientDays);
    const stale = await Client.find({
      archived: false,
      status: 'active',
      $or: [{ lastContactDate: { $lt: cutoff } }, { lastContactDate: { $exists: false } }],
    }).select('name lastContactDate').lean();

    for (const c of stale) {
      const age = c.lastContactDate
        ? daysBetween(startOfToday(new Date(c.lastContactDate)), today)
        : undefined;
      alerts.push({
        key: 'stale_client',
        severity: 'warning',
        title: age ? `לא דיברנו עם ${c.name} כבר ${age} ימים` : `לא תועד קשר עם ${c.name}`,
        entityType: 'client',
        entityId: String(c._id),
        href: `/manage/clients/${c._id}`,
        ageDays: age,
        audience: ['owner', 'pm'],
      });
    }
  }

  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts
    .filter((a) => a.audience.includes(viewer.role))
    .sort((a, b) => rank[a.severity] - rank[b.severity] || (b.ageDays ?? 0) - (a.ageDays ?? 0));
}
