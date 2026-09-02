/**
 * Every /manage calculation lives here — spec ch.04, "the golden rule":
 * a computed number is never stored, and there is exactly one function per
 * calculation so two screens can never show two versions of the same figure.
 *
 * The single exception is project.health, which IS stored so the list can sort
 * and filter on it. It is recomputed on every relevant change.
 */
import { Types } from 'mongoose';
import { IProject, IStage, ProjectHealth, StageStatus } from '../models/manage/Project';
import { TimeEntry } from '../models/manage/TimeEntry';

// ─── Stage template (spec ch.04 §1) ───

export interface StageTemplateEntry {
  key: string;
  name: string;
  percent: number;
}

/** Default template. Percentages sum to 100. Editable in Settings later. */
export const DEFAULT_STAGE_TEMPLATE: StageTemplateEntry[] = [
  { key: 'spec', name: 'אפיון', percent: 10 },
  { key: 'concept', name: 'קונספט', percent: 8 },
  { key: 'content', name: 'כתיבת תוכן', percent: 12 },
  { key: 'design', name: 'עיצוב', percent: 15 },
  { key: 'development', name: 'פיתוח', percent: 35 },
  { key: 'qa', name: 'בדיקות', percent: 8 },
  { key: 'client_fixes', name: 'תיקוני לקוח', percent: 7 },
  { key: 'launch', name: 'עלייה לאוויר', percent: 5 },
  { key: 'maintenance', name: 'תחזוקה', percent: 0 },
];

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Splits a total hour budget across the template.
 * The last non-zero stage absorbs the rounding remainder, so the stage hours
 * always add up to exactly the project total — otherwise "planned vs actual"
 * drifts by a tenth of an hour per project and nobody can explain why.
 */
export function buildStages(
  totalHours: number,
  template: StageTemplateEntry[] = DEFAULT_STAGE_TEMPLATE,
): IStage[] {
  const stages = template.map((entry, i) => ({
    key: entry.key,
    name: entry.name,
    order: i + 1,
    plannedHours: round1((totalHours * entry.percent) / 100),
    status: 'not_started' as StageStatus,
  }));

  const lastWeighted = [...stages].reverse().find((s) => s.plannedHours > 0);
  if (lastWeighted) {
    const sum = stages.reduce((acc, s) => acc + s.plannedHours, 0);
    lastWeighted.plannedHours = round1(lastWeighted.plannedHours + (totalHours - sum));
  }
  return stages;
}

// ─── Status transitions (spec ch.04 §2) ───

export const ALLOWED_PROJECT_TRANSITIONS: Record<string, string[]> = {
  planned: ['active', 'cancelled'],
  active: ['waiting_client', 'on_hold', 'done', 'cancelled'],
  waiting_client: ['active', 'on_hold', 'cancelled'],
  on_hold: ['active', 'cancelled'],
  done: ['maintenance', 'active'],
  maintenance: ['done', 'active', 'cancelled'],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED_PROJECT_TRANSITIONS[from] ?? []).includes(to);
}

// ─── Hours (spec ch.04 §3) ───

export interface ProjectHours {
  plannedHours: number;
  actualHours: number;
  utilization: number;
  remainingHours: number;
  overrunHours: number;
}

/** Real hours on a project, summed from time entries. Never stored. */
export async function actualHours(projectId: Types.ObjectId | string): Promise<number> {
  const [row] = await TimeEntry.aggregate<{ total: number }>([
    { $match: { projectId: new Types.ObjectId(String(projectId)), endedAt: { $ne: null } } },
    { $group: { _id: null, total: { $sum: '$minutes' } } },
  ]);
  return (row?.total ?? 0) / 60;
}

/**
 * Hours for many projects in ONE query. The list screen would otherwise fire a
 * query per row, which is the classic N+1 that only shows up once there is data.
 */
export async function actualHoursByProject(
  projectIds: (Types.ObjectId | string)[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const rows = await TimeEntry.aggregate<{ _id: Types.ObjectId; total: number }>([
    {
      $match: {
        projectId: { $in: projectIds.map((id) => new Types.ObjectId(String(id))) },
        endedAt: { $ne: null },
      },
    },
    { $group: { _id: '$projectId', total: { $sum: '$minutes' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.total / 60]));
}

/** Pure: takes hours already fetched, so callers control how many queries run. */
export function projectHours(
  project: Pick<IProject, '_id' | 'plannedHours'>,
  actual = 0,
): ProjectHours {
  const planned = project.plannedHours || 0;
  return {
    plannedHours: round1(planned),
    actualHours: round1(actual),
    // Guard the divide: a project with no budget is 0% used, not Infinity.
    utilization: planned > 0 ? actual / planned : 0,
    remainingHours: round1(Math.max(0, planned - actual)),
    overrunHours: round1(Math.max(0, actual - planned)),
  };
}

// ─── Health (spec ch.04 §5) ───

/** Fallbacks. The live values come from Settings and are passed in by callers. */
export const HEALTH_THRESHOLDS = { overBudget: 1.0, nearBudget: 0.85, lowProgress: 0.7 };
export type HealthThresholds = typeof HEALTH_THRESHOLDS;

export interface HealthResult {
  health: ProjectHealth;
  healthReason?: string;
}

function diffDays(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / 86_400_000);
}

/**
 * First matching rule wins — order is the spec's, do not reshuffle.
 * `overdueTasks` is passed in rather than queried so this stays pure and testable;
 * it is 0 until Task exists (M5).
 */
export function projectHealth(
  project: Pick<IProject, '_id' | 'status' | 'plannedHours' | 'targetDate'>,
  overdueTasks = 0,
  now: Date = new Date(),
  actual = 0,
  thresholds: HealthThresholds = HEALTH_THRESHOLDS,
): HealthResult {
  if (project.status === 'done' || project.status === 'cancelled') return { health: 'green' };

  const { utilization } = projectHours(project, actual);
  const daysToTarget = project.targetDate ? diffDays(new Date(project.targetDate), now) : null;

  if (utilization > thresholds.overBudget) {
    return { health: 'red', healthReason: 'חריגה מתקציב השעות' };
  }
  if (daysToTarget !== null && daysToTarget < 0) {
    return { health: 'red', healthReason: 'עבר תאריך היעד' };
  }
  if (utilization >= thresholds.nearBudget) {
    return { health: 'orange', healthReason: 'מתקרב לתקציב השעות' };
  }
  if (daysToTarget !== null && daysToTarget <= 7 && utilization < thresholds.lowProgress) {
    return { health: 'orange', healthReason: 'שבוע ליעד ופחות מ-70% מהעבודה בוצעה' };
  }
  if (overdueTasks > 0) {
    return { health: 'orange', healthReason: 'יש משימות באיחור' };
  }
  return { health: 'green' };
}
