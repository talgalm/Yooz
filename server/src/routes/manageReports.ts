import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import {
  hoursByCategory, hoursByUser, hoursByProject,
  estimateVsActual, profitabilityByClient, clientActivity,
} from '../services/manageReports';

const router = Router();
router.use(authenticateManage);
// pm sees the reports without money; a member has no business here at all.
router.use(requireManageRole('owner', 'pm'));

export const REPORT_KEYS = [
  'hours_by_category', 'hours_by_user', 'hours_by_project',
  'estimate_vs_actual', 'profitability_by_client', 'client_activity',
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

/** Reports that expose money, and are therefore owner-only. */
const OWNER_ONLY_REPORTS: ReportKey[] = ['profitability_by_client'];

/**
 * Ranges are parsed as LOCAL dates, not UTC.
 *
 * `new Date('2026-09-01')` is UTC midnight, which in Israel is 03:00 local — so
 * a time entry stored at local midnight sits BEFORE it and silently drops out
 * of the report. Every range would quietly lose its first day.
 */
function localMidnight(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseRange(req: Request) {
  const now = new Date();
  const from = (req.query.from && localMidnight(String(req.query.from)))
    || new Date(now.getFullYear(), now.getMonth(), 1);
  const to = (req.query.to && localMidnight(String(req.query.to)))
    || new Date(now.getFullYear(), now.getMonth() + 1, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function buildReport(key: ReportKey, req: Request) {
  const range = parseRange(req);
  const includeMoney = req.manageUser!.role === 'owner';

  switch (key) {
    case 'hours_by_category': return { rows: await hoursByCategory(range) };
    case 'hours_by_user': return { rows: await hoursByUser(range, includeMoney) };
    case 'hours_by_project': return { rows: await hoursByProject(range, includeMoney) };
    case 'estimate_vs_actual': return await estimateVsActual();
    case 'profitability_by_client': return { rows: await profitabilityByClient() };
    case 'client_activity': return { rows: await clientActivity(range) };
    default: return { rows: [] };
  }
}

router.get('/:key', async (req: Request, res: Response) => {
  const key = String(req.params.key) as ReportKey;
  if (!REPORT_KEYS.includes(key)) {
    res.status(404).json({ error: 'unknown_report' });
    return;
  }
  if (OWNER_ONLY_REPORTS.includes(key) && req.manageUser!.role !== 'owner') {
    res.status(403).json({ error: 'owner_only' });
    return;
  }
  const range = parseRange(req);
  res.json({ key, from: range.from, to: range.to, ...(await buildReport(key, req)) });
});

/** Hebrew column headers, per report. */
const COLUMNS: Record<ReportKey, { key: string; header: string; money?: boolean }[]> = {
  hours_by_category: [
    { key: 'category', header: 'קטגוריה' },
    { key: 'hours', header: 'שעות' },
    { key: 'share', header: 'חלק מהתקופה' },
  ],
  hours_by_user: [
    { key: 'name', header: 'עובד' },
    { key: 'hours', header: 'שעות' },
    { key: 'cost', header: 'עלות', money: true },
  ],
  hours_by_project: [
    { key: 'name', header: 'פרויקט' },
    { key: 'clientName', header: 'לקוח' },
    { key: 'plannedHours', header: 'תקציב שעות' },
    { key: 'hours', header: 'שעות בפועל' },
    { key: 'cost', header: 'עלות', money: true },
  ],
  estimate_vs_actual: [
    { key: 'name', header: 'שלב' },
    { key: 'planned', header: 'מתוכנן' },
    { key: 'actual', header: 'בפועל' },
    { key: 'deviation', header: 'סטייה' },
    { key: 'samples', header: 'מספר פרויקטים' },
  ],
  profitability_by_client: [
    { key: 'name', header: 'לקוח' },
    { key: 'projects', header: 'פרויקטים' },
    { key: 'revenue', header: 'הכנסה', money: true },
    { key: 'cost', header: 'עלות', money: true },
    { key: 'profit', header: 'רווח', money: true },
    { key: 'margin', header: 'מרג׳ין', money: true },
  ],
  client_activity: [
    { key: 'name', header: 'לקוח' },
    { key: 'status', header: 'סטטוס' },
    { key: 'daysSinceContact', header: 'ימים מאז קשר' },
    { key: 'interactions', header: 'תיעודים בתקופה' },
  ],
};

/**
 * Excel export.
 *
 * Goes through the SAME builder as the on-screen report, and drops money
 * columns for a pm. Export is the classic leak: a screen filters correctly and
 * then the download hands over everything.
 */
router.get('/:key/export', async (req: Request, res: Response) => {
  const key = String(req.params.key) as ReportKey;
  if (!REPORT_KEYS.includes(key)) {
    res.status(404).json({ error: 'unknown_report' });
    return;
  }
  if (OWNER_ONLY_REPORTS.includes(key) && req.manageUser!.role !== 'owner') {
    res.status(403).json({ error: 'owner_only' });
    return;
  }

  const data = await buildReport(key, req);
  const rows = (key === 'estimate_vs_actual'
    ? (data as { stages: unknown[] }).stages
    : (data as { rows: unknown[] }).rows) as Record<string, unknown>[];

  const isOwner = req.manageUser!.role === 'owner';
  const columns = COLUMNS[key].filter((c) => isOwner || !c.money);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(key, { views: [{ rightToLeft: true }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.key, row[c.key] ?? ''])));
  }

  const range = parseRange(req);
  const stamp = `${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${key}_${stamp}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
