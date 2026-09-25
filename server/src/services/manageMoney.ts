import { Types } from 'mongoose';
import { TimeEntry } from '../models/manage/TimeEntry';
import { Expense } from '../models/manage/Expense';
import { ChangeRequest } from '../models/manage/ChangeRequest';
import { IProject } from '../models/manage/Project';
import { round2 } from './manageMetrics';

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
  excludesManagementHours: boolean;
}

export function monthsElapsed(start: Date, asOf: Date): number {
  const months = (asOf.getFullYear() - start.getFullYear()) * 12
    + (asOf.getMonth() - start.getMonth())
    + (asOf.getDate() >= start.getDate() ? 1 : 0);
  return Math.max(0, months);
}

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
    margin: revenue > 0 ? roundRatio(grossProfit / revenue) : 0,
    effectiveRatePerHour: input.actualHours > 0 ? round2(revenue / input.actualHours) : 0,
    excludesManagementHours: true,
  };
}

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

  const r = project.recurring;
  const active = !!r?.enabled && !!r.startDate
    && new Date(r.startDate) <= end
    && (!r.endDate || new Date(r.endDate) >= start);
  const revenue = round2(active ? r!.monthlyAmount : 0);
  const cost = round2((labor?.total ?? 0) + (expenses?.total ?? 0));
  const profit = round2(revenue - cost);

  return { month, revenue, cost, profit, margin: revenue > 0 ? roundRatio(profit / revenue) : 0 };
}

export function mrrOf(
  projects: Pick<IProject, 'status' | 'recurring'>[],
  asOf: Date = new Date(),
): number {
  return round2(projects.reduce((sum, p) => {
    const r = p.recurring;
    if (!r?.enabled || !r.monthlyAmount) return sum;
    if (!['active', 'maintenance'].includes(p.status)) return sum;
    if (r.endDate && new Date(r.endDate) <= asOf) return sum;
    return sum + r.monthlyAmount;
  }, 0));
}
