import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../models/manage/Expense';
import { ChangeRequest, CHANGE_REQUEST_STATUSES, ChangeRequestStatus } from '../models/manage/ChangeRequest';
import { Project } from '../models/manage/Project';
import { Client } from '../models/manage/Client';
import { TimeEntry } from '../models/manage/TimeEntry';
import { ManageUser } from '../models/manage/ManageUser';
import { actualHoursByProject, round2 } from '../services/manageMetrics';
import { getSettings } from '../services/manageSettings';
import {
  projectMoney, projectMonthMoney, mrrOf,
  laborCostByProject, expenseTotalByProject, changeRequestRevenueByProject,
} from '../services/manageMoney';

const router = Router();
router.use(authenticateManage);

/**
 * EVERYTHING in this file is owner-only, enforced at the router.
 *
 * This is a route-level gate, not output filtering: a pm hitting /expenses gets
 * 403 rather than an empty list, so there is no shape of request that returns a
 * cost figure to anyone else.
 */
router.use(requireManageRole('owner'));

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'invalid_id' });
  return true;
}

// ─── Expenses ───

router.get('/expenses', async (req: Request, res: Response) => {
  const { projectId, category } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
  if (category && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) filter.category = category;

  const expenses = await Expense.find(filter).sort({ date: -1 }).populate('projectId', 'name').lean();
  res.json({ expenses, total: round2(expenses.reduce((a, e) => a + e.amount, 0)) });
});

router.post('/expenses', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.projectId !== 'string' || !Types.ObjectId.isValid(body.projectId)) {
    res.status(400).json({ error: 'project_required' });
    return;
  }
  if (!EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
    res.status(400).json({ error: 'invalid_category' });
    return;
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amount_must_be_positive' });
    return;
  }
  const date = body.date ? new Date(body.date as string) : new Date();
  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }

  const expense = await Expense.create({
    projectId: body.projectId,
    date,
    category: body.category as ExpenseCategory,
    vendor: typeof body.vendor === 'string' ? body.vendor.trim() : undefined,
    amount: round2(amount),
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    billable: !!body.billable,
    documentUrl: typeof body.documentUrl === 'string' ? body.documentUrl.trim() : undefined,
    createdBy: req.manageUser!.userId,
  });
  res.status(201).json({ expense });
});

router.patch('/expenses/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) update.category = body.category;
  if (Number.isFinite(Number(body.amount)) && Number(body.amount) > 0) update.amount = round2(Number(body.amount));
  for (const k of ['vendor', 'description', 'documentUrl']) {
    if (typeof body[k] === 'string') update[k] = (body[k] as string).trim();
  }
  if (typeof body.billable === 'boolean') update.billable = body.billable;
  if (typeof body.date === 'string') {
    const d = new Date(body.date);
    if (!Number.isNaN(d.getTime())) update.date = d;
  }
  const expense = await Expense.findByIdAndUpdate(String(req.params.id), update, { new: true });
  if (!expense) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ expense });
});

router.delete('/expenses/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const expense = await Expense.findByIdAndDelete(String(req.params.id));
  if (!expense) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ ok: true });
});

// ─── Project profitability ───

router.get('/project/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const project = await Project.findById(String(req.params.id)).lean();
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const id = String(project._id);
  const [labor, expenses, crRevenue, hours] = await Promise.all([
    laborCostByProject([id]),
    expenseTotalByProject([id]),
    changeRequestRevenueByProject([id]),
    actualHoursByProject([id]),
  ]);

  const money = projectMoney(project as never, {
    laborCost: labor[id] ?? 0,
    expenseTotal: expenses[id] ?? 0,
    changeRequestRevenue: crRevenue[id] ?? 0,
    actualHours: hours[id] ?? 0,
  });

  // Both views, side by side — "is this month profitable" and "was the whole
  // engagement worth it" are different questions and both get asked.
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const monthly = await projectMonthMoney(project as never, month);

  res.json({ cumulative: money, monthly, actualHours: hours[id] ?? 0 });
});

// ─── Change requests ───

router.get('/change-requests', async (req: Request, res: Response) => {
  const { projectId, status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
  if (status && CHANGE_REQUEST_STATUSES.includes(status as ChangeRequestStatus)) filter.status = status;
  const changeRequests = await ChangeRequest.find(filter).sort({ date: -1 }).lean();
  res.json({ changeRequests });
});

router.post('/change-requests', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.projectId !== 'string' || !Types.ObjectId.isValid(body.projectId)) {
    res.status(400).json({ error: 'project_required' });
    return;
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    res.status(400).json({ error: 'description_required' });
    return;
  }
  const cr = await ChangeRequest.create({
    projectId: body.projectId,
    date: body.date ? new Date(body.date as string) : new Date(),
    requestedByName: typeof body.requestedByName === 'string' ? body.requestedByName.trim() : undefined,
    description: body.description.trim(),
    estimatedHours: Number(body.estimatedHours) || 0,
    additionalPrice: Number(body.additionalPrice) || 0,
    createdBy: req.manageUser!.userId,
  });
  res.status(201).json({ changeRequest: cr });
});

/**
 * Approving a change request grows the project's hour budget.
 *
 * This is what stops an approved scope increase from reading as an overrun.
 * `appliedToBudget` makes it idempotent — approving twice must not add the
 * hours twice, and status can legitimately move approved -> done -> approved.
 */
router.patch('/change-requests/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const cr = await ChangeRequest.findById(String(req.params.id));
  if (!cr) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.description === 'string' && body.description.trim()) cr.description = body.description.trim();
  if (Number.isFinite(Number(body.estimatedHours))) cr.estimatedHours = Number(body.estimatedHours);
  if (Number.isFinite(Number(body.additionalPrice))) cr.additionalPrice = Number(body.additionalPrice);

  if (typeof body.status === 'string' && CHANGE_REQUEST_STATUSES.includes(body.status as ChangeRequestStatus)) {
    const next = body.status as ChangeRequestStatus;
    const becomesApproved = (next === 'approved' || next === 'done');

    if (becomesApproved && !cr.appliedToBudget && cr.estimatedHours > 0) {
      await Project.findByIdAndUpdate(cr.projectId, { $inc: { plannedHours: cr.estimatedHours } });
      cr.appliedToBudget = true;
    }
    // Rejecting something already applied gives the hours back.
    if (next === 'rejected' && cr.appliedToBudget && cr.estimatedHours > 0) {
      await Project.findByIdAndUpdate(cr.projectId, { $inc: { plannedHours: -cr.estimatedHours } });
      cr.appliedToBudget = false;
    }
    if (becomesApproved && !cr.approvedAt) cr.approvedAt = new Date();
    cr.status = next;
  }

  await cr.save();
  res.json({ changeRequest: cr });
});

router.delete('/change-requests/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const cr = await ChangeRequest.findById(String(req.params.id));
  if (!cr) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  // Take the budget back with it, or the project keeps hours nobody agreed to.
  if (cr.appliedToBudget && cr.estimatedHours > 0) {
    await Project.findByIdAndUpdate(cr.projectId, { $inc: { plannedHours: -cr.estimatedHours } });
  }
  await cr.deleteOne();
  res.json({ ok: true });
});

// ─── Payments received (payment milestones on a project) ───

/**
 * What the client actually owes and has paid, per project.
 *
 * This is billing at PLANNING level only — an amount, a date, and two manual
 * checkboxes. The accounting software stays the source of truth for invoices;
 * duplicating it here would create two answers to "how much did they pay".
 */
router.get('/payments', async (_req: Request, res: Response) => {
  const projects = await Project.find({ archived: false, 'paymentMilestones.0': { $exists: true } })
    .select('name clientId paymentMilestones').lean();
  const clients = await Client.find({ _id: { $in: projects.map((p) => p.clientId).filter(Boolean) as never } })
    .select('name').lean();
  const clientNames = Object.fromEntries(clients.map((c) => [String(c._id), c.name]));

  const rows = projects.flatMap((p) => (p.paymentMilestones ?? []).map((m) => ({
    projectId: p._id,
    projectName: p.name,
    clientName: p.clientId ? clientNames[String(p.clientId)] : undefined,
    ...m,
  })));

  const total = round2(rows.reduce((a, r) => a + r.amount, 0));
  const invoiced = round2(rows.filter((r) => r.invoiced).reduce((a, r) => a + r.amount, 0));
  const paid = round2(rows.filter((r) => r.paid).reduce((a, r) => a + r.amount, 0));
  // Three different numbers, deliberately kept apart (needs doc §10).
  res.json({ payments: rows, total, invoiced, paid, outstanding: round2(invoiced - paid) });
});

router.post('/project/:id/payments', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amount_must_be_positive' });
    return;
  }
  if (typeof body.label !== 'string' || !body.label.trim()) {
    res.status(400).json({ error: 'label_required' });
    return;
  }
  const project = await Project.findById(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  project.paymentMilestones.push({
    label: body.label.trim(),
    amount: round2(amount),
    plannedDate: typeof body.plannedDate === 'string' && body.plannedDate ? new Date(body.plannedDate) : undefined,
    invoiced: false,
    paid: false,
    note: typeof body.note === 'string' ? body.note.trim() : undefined,
  } as never);
  await project.save();
  res.status(201).json({ paymentMilestones: project.paymentMilestones });
});

router.patch('/project/:id/payments/:milestoneId', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id)) || badId(res, String(req.params.milestoneId))) return;
  const project = await Project.findById(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const m = project.paymentMilestones.find((x) => String(x._id) === String(req.params.milestoneId));
  if (!m) {
    res.status(404).json({ error: 'milestone_not_found' });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.label === 'string' && body.label.trim()) m.label = body.label.trim();
  if (Number.isFinite(Number(body.amount)) && Number(body.amount) > 0) m.amount = round2(Number(body.amount));
  if (typeof body.plannedDate === 'string') {
    const d = new Date(body.plannedDate);
    m.plannedDate = Number.isNaN(d.getTime()) ? undefined : d;
  }
  // Ticking the box stamps the date, so "when did they pay" is answerable later.
  if (typeof body.invoiced === 'boolean') {
    m.invoiced = body.invoiced;
    m.invoicedAt = body.invoiced ? (m.invoicedAt ?? new Date()) : undefined;
  }
  if (typeof body.paid === 'boolean') {
    m.paid = body.paid;
    m.paidAt = body.paid ? (m.paidAt ?? new Date()) : undefined;
    // Money cannot arrive for something never billed.
    if (body.paid && !m.invoiced) { m.invoiced = true; m.invoicedAt = m.invoicedAt ?? new Date(); }
  }
  await project.save();
  res.json({ paymentMilestones: project.paymentMilestones });
});

router.delete('/project/:id/payments/:milestoneId', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id)) || badId(res, String(req.params.milestoneId))) return;
  const project = await Project.findById(String(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  project.paymentMilestones = project.paymentMilestones
    .filter((x) => String(x._id) !== String(req.params.milestoneId)) as never;
  await project.save();
  res.json({ paymentMilestones: project.paymentMilestones });
});

// ─── Employee cost rates ───

/**
 * What each person costs per hour. This is the input the entire profitability
 * calculation rests on, and until now it only existed as seed data.
 *
 * It is a PRICING rate, not payroll: the system does not compute salaries or
 * produce payslips (spec ch.00). Changing it never restates history, because
 * every time entry keeps the rate it was written with.
 */
router.get('/rates', async (_req: Request, res: Response) => {
  const users = await ManageUser.find({ active: true }).sort({ name: 1 })
    .select('name role hourlyCost employerCostFactor tracksTime').lean();
  res.json({
    rates: users.map((u) => ({
      _id: u._id,
      name: u.name,
      role: u.role,
      tracksTime: u.tracksTime,
      hourlyCost: u.hourlyCost,
      employerCostFactor: u.employerCostFactor,
      effectiveHourlyCost: round2(u.hourlyCost * (1 + u.employerCostFactor)),
    })),
  });
});

router.patch('/rates/:userId', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.userId))) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (Number.isFinite(Number(body.hourlyCost)) && Number(body.hourlyCost) >= 0) {
    update.hourlyCost = round2(Number(body.hourlyCost));
  }
  if (Number.isFinite(Number(body.employerCostFactor)) && Number(body.employerCostFactor) >= 0) {
    update.employerCostFactor = Number(body.employerCostFactor);
  }
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'nothing_to_update' });
    return;
  }
  const user = await ManageUser.findByIdAndUpdate(String(req.params.userId), update, { new: true });
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({
    rate: {
      _id: user._id,
      name: user.name,
      role: user.role,
      tracksTime: user.tracksTime,
      hourlyCost: user.hourlyCost,
      employerCostFactor: user.employerCostFactor,
      effectiveHourlyCost: round2(user.hourlyCost * (1 + user.employerCostFactor)),
    },
  });
});

// ─── The finance screen ───

router.get('/summary', async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const projects = await Project.find({ archived: false }).lean();
  const ids = projects.map((p) => String(p._id));

  const [labor, expenses, crRevenue, hours, clients] = await Promise.all([
    laborCostByProject(ids),
    expenseTotalByProject(ids),
    changeRequestRevenueByProject(ids),
    actualHoursByProject(ids),
    Client.find({ archived: false }).select('name').lean(),
  ]);
  const clientNames = Object.fromEntries(clients.map((c) => [String(c._id), c.name]));

  const rows = projects.map((p) => {
    const id = String(p._id);
    const money = projectMoney(p as never, {
      laborCost: labor[id] ?? 0,
      expenseTotal: expenses[id] ?? 0,
      changeRequestRevenue: crRevenue[id] ?? 0,
      actualHours: hours[id] ?? 0,
    });
    return {
      _id: p._id,
      name: p.name,
      type: p.type,
      status: p.status,
      clientName: p.clientId ? clientNames[String(p.clientId)] : undefined,
      actualHours: hours[id] ?? 0,
      ...money,
    };
  });

  const clientRows = rows.filter((r) => r.type === 'client');
  // Internal work and demos have no revenue by design — their cost IS the
  // investment figure, and mixing them into margin would drag it meaningless.
  const internalRows = rows.filter((r) => r.type !== 'client');

  const totals = {
    revenue: round2(clientRows.reduce((a, r) => a + r.revenue, 0)),
    cost: round2(clientRows.reduce((a, r) => a + r.totalCost, 0)),
    profit: round2(clientRows.reduce((a, r) => a + r.grossProfit, 0)),
  };

  const [monthLabor] = await TimeEntry.aggregate<{ total: number }>([
    {
      $match: {
        endedAt: { $ne: null },
        date: {
          $gte: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
          $lte: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 23, 59, 59, 999),
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$costAmount' } } },
  ]);

  const mrr = mrrOf(projects as never);

  // Contracts ending inside 90 days — the renewal conversation you want to have
  // before the client has it for you.
  const soon = new Date();
  soon.setDate(soon.getDate() + (await getSettings()).thresholds.contractEndingDays);
  const endingSoon = projects
    .filter((p) => {
      const end = p.contract?.endDate ?? p.recurring?.endDate;
      return end && new Date(end) > new Date() && new Date(end) <= soon;
    })
    .map((p) => ({
      _id: p._id,
      name: p.name,
      clientName: p.clientId ? clientNames[String(p.clientId)] : undefined,
      endDate: p.contract?.endDate ?? p.recurring?.endDate,
    }));

  res.json({
    month,
    totals,
    mrr,
    arr: round2(mrr * 12),
    monthLaborCost: round2(monthLabor?.total ?? 0),
    projects: rows,
    internalInvestment: {
      totalCost: round2(internalRows.reduce((a, r) => a + r.totalCost, 0)),
      hours: round2(internalRows.reduce((a, r) => a + r.actualHours, 0)),
      rows: internalRows,
    },
    endingSoon,
    excludesManagementHours: true,
  });
});

export default router;
