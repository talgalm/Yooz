/**
 * Every money calculation — spec ch.04 §4. Owner-only territory.
 *
 * Same golden rule as manageMetrics: nothing here is stored, there is one
 * function per figure, and callers pass in what they already fetched so a list
 * screen does not fire a query per row.
 *
 * A number in this file being quietly wrong is the worst failure mode in the
 * system — it looks plausible for months. Hence the self-check beside it.
 */
import { Types } from 'mongoose';
import { TimeEntry } from '../models/manage/TimeEntry';
import { Expense } from '../models/manage/Expense';
import { ChangeRequest } from '../models/manage/ChangeRequest';
import { IProject } from '../models/manage/Project';
import { round2 } from './manageMetrics';

/**
 * Margin is a RATIO, not a shekel amount, so it must not be rounded to 2dp:
 * 13900/28000 = 0.49642... and round2 turns that into 0.5, which the UI then
 * prints as "50%" where the correct answer is 49.6%. Percentages are displayed
 * to one decimal (spec ch.04), which needs four decimals of ratio to survive.
 */
function roundRatio(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export interface ProjectMoney {
  laborCost: number;
  expenseTotal: number;
  totalCost: number;
  oneTimeRevenue: number;
  recurringToDate: number;
  revenue: number;
  grossProfit: number;
  margin: number;
  effectiveRatePerHour: number;
  /**
   * Always true in phase one: the owner does not report hours (ch.10 decision 2),
   * so management time is not in labour cost. The UI must print this — a number
   * without its caveat becomes a number people trust more than it deserves.
   */
  excludesManagementHours: boolean;
}

/** Whole months elapsed from `start` up to `asOf`, floored at 0. */
export function monthsElapsed(start: Date, asOf: Date): number {
  const months = (asOf.getFullYear() - start.getFullYear()) * 12
    + (asOf.getMonth() - start.getMonth())
    // Not a full month until the day-of-month comes round again.
    + (asOf.getDate() >= start.getDate() ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Recurring revenue billed so far on one project.
 * Stops accruing at the contract end date — a finished retainer must not keep
 * inflating revenue forever.
 */
export function recurringToDate(
  recurring: IProject['recurring'] | undefined,
  asOf: Date = new Date(),
): number {
  if (!recurring?.enabled || !recurring.startDate || !recurring.monthlyAmount) return 0;
  const start = new Date(recurring.startDate);
  if (start > asOf) return 0;
  const until = recurring.endDate && new Date(recurring.endDate) < asOf
    ? new Date(recurring.endDate)
    : asOf;
  return round2(recurring.monthlyAmount * monthsElapsed(start, until));
}

/** Sums time-entry cost per project in one query. */
export async function laborCostByProject(
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
    { $group: { _id: '$projectId', total: { $sum: '$costAmount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), round2(r.total)]));
}

export async function expenseTotalByProject(
  projectIds: (Types.ObjectId | string)[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const rows = await Expense.aggregate<{ _id: Types.ObjectId; total: number }>([
    { $match: { projectId: { $in: projectIds.map((id) => new Types.ObjectId(String(id))) } } },
    { $group: { _id: '$projectId', total: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), round2(r.total)]));
}

/** Approved and delivered change requests add to the agreed price. */
export async function changeRequestRevenueByProject(
  projectIds: (Types.ObjectId | string)[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const rows = await ChangeRequest.aggregate<{ _id: Types.ObjectId; total: number }>([
    {
      $match: {
        projectId: { $in: projectIds.map((id) => new Types.ObjectId(String(id))) },
        status: { $in: ['approved', 'done'] },
      },
    },
    { $group: { _id: '$projectId', total: { $sum: '$additionalPrice' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), round2(r.total)]));
}

/** Pure. Everything it needs is passed in. */
export function projectMoney(
  project: Pick<IProject, 'agreedPrice' | 'recurring'>,
  input: { laborCost: number; expenseTotal: number; changeRequestRevenue: number; actualHours: number },
  asOf: Date = new Date(),
): ProjectMoney {
  const laborCost = round2(input.laborCost);
  const expenseTotal = round2(input.expenseTotal);
  const totalCost = round2(laborCost + expenseTotal);

  const oneTimeRevenue = round2((project.agreedPrice ?? 0) + input.changeRequestRevenue);
  const recurring = recurringToDate(project.recurring, asOf);
  const revenue = round2(oneTimeRevenue + recurring);

  const grossProfit = round2(revenue - totalCost);
  return {
    laborCost,
    expenseTotal,
    totalCost,
    oneTimeRevenue,
    recurringToDate: recurring,
    revenue,
    grossProfit,
    // Guard both divides: no revenue is 0%, not NaN or Infinity.
    margin: revenue > 0 ? roundRatio(grossProfit / revenue) : 0,
    effectiveRatePerHour: input.actualHours > 0 ? round2(revenue / input.actualHours) : 0,
    excludesManagementHours: true,
  };
}

/** One month's slice of a project — the default view for a retainer client. */
export async function projectMonthMoney(
  project: Pick<IProject, '_id' | 'agreedPrice' | 'recurring'>,
  month: string,
): Promise<{ month: string; revenue: number; cost: number; profit: number; margin: number }> {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  const id = new Types.ObjectId(String(project._id));

  const [labor] = await TimeEntry.aggregate<{ total: number }>([
    { $match: { projectId: id, endedAt: { $ne: null }, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$costAmount' } } },
  ]);
  const [expenses] = await Expense.aggregate<{ total: number }>([
    { $match: { projectId: id, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Only the recurring fee lands in a month; a one-off price belongs to the
  // whole engagement and would double-count if spread across every month.
  const r = project.recurring;
  const active = !!r?.enabled && !!r.startDate
    && new Date(r.startDate) <= end
    && (!r.endDate || new Date(r.endDate) >= start);
  const revenue = round2(active ? r!.monthlyAmount : 0);
  const cost = round2((labor?.total ?? 0) + (expenses?.total ?? 0));
  const profit = round2(revenue - cost);

  return { month, revenue, cost, profit, margin: revenue > 0 ? roundRatio(profit / revenue) : 0 };
}

/** Monthly recurring revenue across the business. */
export function mrrOf(
  projects: Pick<IProject, 'status' | 'recurring'>[],
  asOf: Date = new Date(),
): number {
  return round2(projects.reduce((sum, p) => {
    const r = p.recurring;
    if (!r?.enabled || !r.monthlyAmount) return sum;
    if (!['active', 'maintenance'].includes(p.status)) return sum;
    // An ended contract is not recurring revenue any more.
    if (r.endDate && new Date(r.endDate) <= asOf) return sum;
    return sum + r.monthlyAmount;
  }, 0));
}
