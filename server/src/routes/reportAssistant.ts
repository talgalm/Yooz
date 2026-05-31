/**
 * Admin AI Report Assistant.
 *
 * Two endpoints:
 *   POST /api/admin/report-assistant/chat      — classify request; if a built-in export
 *                                                covers it, return that. Otherwise call
 *                                                Gemini with the activity's full data
 *                                                snapshot and return a custom report.
 *   POST /api/admin/report-assistant/download  — generate an XLSX from a tabular report
 *                                                produced by /chat.
 *
 * Admin-only. PII (participant names/emails) is included in the context by product
 * decision so admins can ask participant-level questions.
 */

import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { customerOwnsDoc } from '../middleware/customerScope';
import { Activity } from '../models';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { buildReportContext } from '../services/reportContext';

const router = Router();
router.use(authenticateAdmin, requireRole('admin', 'super_admin', 'customer'));

// ─── Rate limit (5 req/min/admin) ───

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
}, 5 * 60_000);

// ─── Existing report catalog (kept in sync with analytics.ts + ExportSection.tsx) ───

interface ReportCatalogEntry {
  key: string;
  kind: 'export' | 'view';
  labelHe: string;
  labelEn: string;
  descHe: string;
  descEn: string;
  keywords: string[];
}

const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    key: 'executive',
    kind: 'export',
    labelHe: 'דוח מנהלים (Excel)',
    labelEn: 'Executive report (Excel)',
    descHe: 'סיכום מקיף: מדדים כלליים, ציונים, התקדמות, פריטים, שאלות, קבוצות והמלצות',
    descEn: 'Comprehensive: KPIs, scores, progress, items, questions, groups, recommendations',
    keywords: ['executive', 'summary', 'overview', 'kpi', 'מנהלים', 'סיכום', 'מקיף', 'כללי'],
  },
  {
    key: 'participants',
    kind: 'export',
    labelHe: 'דוח משתתפים (Excel)',
    labelEn: 'Participants report (Excel)',
    descHe: 'רשימת משתתפים: שם, מייל, טלפון, קבוצה, סטטוס, ציון, התקדמות',
    descEn: 'Participant list: name, email, phone, group, status, score, progress',
    keywords: ['participants', 'people', 'users', 'contact', 'attendees', 'משתתפים', 'אנשים', 'רשימת'],
  },
  {
    key: 'scores',
    kind: 'export',
    labelHe: 'דוח ציונים (Excel)',
    labelEn: 'Scores report (Excel)',
    descHe: 'ציונים מפורטים: לכל משתתף לפי משחק/שאלה',
    descEn: 'Detailed scores per participant per item/question',
    keywords: ['scores', 'points', 'grades', 'ציונים', 'נקודות'],
  },
  {
    key: 'progress',
    kind: 'export',
    labelHe: 'דוח התקדמות (Excel)',
    labelEn: 'Progress report (Excel)',
    descHe: 'התקדמות, צווארי בקבוק, מעקב המשך',
    descEn: 'Progress, bottlenecks, follow-up data',
    keywords: ['progress', 'completion', 'funnel', 'התקדמות', 'השלמה'],
  },
  {
    key: 'funnel',
    kind: 'view',
    labelHe: 'משפך השתתפות',
    labelEn: 'Participation funnel',
    descHe: 'נרשמו → התחילו → חצי דרך → השלימו',
    descEn: 'joined → started → halfway → completed',
    keywords: ['funnel', 'dropout', 'משפך', 'נטישה'],
  },
  {
    key: 'items',
    kind: 'view',
    labelHe: 'ניתוח לפי תחנה / משחק',
    labelEn: 'Per-station / per-game analytics',
    descHe: 'אחוז השלמה, ציון ממוצע, זמן ממוצע, שימוש ברמזים לכל משחק',
    descEn: 'Per-item: completion %, avg score, avg time, hint usage',
    keywords: ['items', 'stations', 'games', 'per game', 'תחנה', 'משחק', 'תחנות', 'משחקים'],
  },
  {
    key: 'groups',
    kind: 'view',
    labelHe: 'השוואת קבוצות',
    labelEn: 'Group comparison',
    descHe: 'ציון, השלמה וזמן ממוצעים לכל קבוצה',
    descEn: 'Avg score, completion, duration per group/branch',
    keywords: ['groups', 'teams', 'branches', 'קבוצות', 'צוותים', 'סניפים'],
  },
];

function classifyExisting(message: string): ReportCatalogEntry | null {
  const m = message.toLowerCase();
  let best: { entry: ReportCatalogEntry; hits: number } | null = null;
  for (const entry of REPORT_CATALOG) {
    let hits = 0;
    for (const kw of entry.keywords) {
      if (m.includes(kw.toLowerCase())) hits++;
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { entry, hits };
  }
  return best?.entry ?? null;
}

// ─── Gemini call ───

interface GeminiReport {
  summary: string;
  table?: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  } | null;
}

interface HistoryEntry {
  from: 'bot' | 'user';
  text: string;
}

function buildSystemPrompt(lang: 'en' | 'he'): string {
  const langName = lang === 'he' ? 'Hebrew' : 'English';
  return `You are a data analyst for Yooz, an interactive group activity platform. The admin is asking for a report that isn't covered by the built-in exports. Use ONLY the JSON data provided in the user message — do not invent numbers.

Respond ONLY with a valid JSON object matching this exact shape (no markdown fences, no prose before/after):
{
  "summary": "<markdown report — sections, bullets, short tables OK>",
  "table": null OR {
    "title": "<short title>",
    "columns": ["<col1>", "<col2>", ...],
    "rows": [["<r1c1>", "<r1c2>", ...], ...]
  }
}

Rules:
- Respond in ${langName}.
- summary: 2–8 short paragraphs / bullet sections in markdown. Cite real numbers from the data.
- table: include a structured table when the request would benefit from one (ranking, per-participant, per-item, per-group breakdown). Otherwise null. Keep ≤ 50 rows.
- If the data is insufficient, say so plainly in summary and set table to null.
- Don't repeat the user's question. Don't add disclaimers.
- Numbers: round to integers unless precision matters.
- Available existing exports (mention them if relevant): Executive, Participants, Scores, Progress (all Excel).`;
}

async function askGemini(message: string, contextJson: string, lang: 'en' | 'he', history: HistoryEntry[]): Promise<GeminiReport> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const priorTurns = history.slice(-4).map((h) => ({
    role: h.from === 'bot' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }));

  const contents = [
    ...priorTurns,
    {
      role: 'user',
      parts: [
        { text: `ACTIVITY DATA:\n${contextJson}\n\nADMIN REQUEST:\n${message}` },
      ],
    },
  ];

  const body = {
    contents,
    systemInstruction: { parts: [{ text: buildSystemPrompt(lang) }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty Gemini response');
    const parsed = JSON.parse(text) as GeminiReport;
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      throw new Error('Invalid Gemini response shape');
    }
    if (parsed.table && (!Array.isArray(parsed.table.columns) || !Array.isArray(parsed.table.rows))) {
      parsed.table = null;
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════
// ─── POST /chat ───
// ═══════════════════════════════════════════════

router.post('/chat', async (req: Request, res: Response) => {
  const adminKey = req.admin?.email || req.ip || 'unknown';
  if (isRateLimited(adminKey)) {
    res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    return;
  }

  const { activityId, message, history, lang } = req.body as {
    activityId?: string;
    message?: string;
    history?: HistoryEntry[];
    lang?: string;
  };

  if (!activityId || !Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activityId' });
    return;
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Ownership check
  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const safeLang: 'en' | 'he' = lang === 'he' ? 'he' : 'en';
  const safeMessage = message.trim().slice(0, 800);
  const safeHistory: HistoryEntry[] = Array.isArray(history)
    ? history.filter((h) => h && typeof h.text === 'string' && (h.from === 'bot' || h.from === 'user')).slice(-10)
    : [];

  // Step A — classifier
  const existing = classifyExisting(safeMessage);
  if (existing) {
    const label = safeLang === 'he' ? existing.labelHe : existing.labelEn;
    const desc = safeLang === 'he' ? existing.descHe : existing.descEn;
    const suggestion = safeLang === 'he'
      ? `נראה לי שאתה מחפש את ה**${label}** — ${desc}. רוצה לפתוח אותו?`
      : `Sounds like you're looking for the **${label}** — ${desc}. Want to open it?`;
    res.json({
      kind: 'existing',
      reportType: existing.key,
      reportKind: existing.kind,
      label,
      description: desc,
      suggestion,
    });
    return;
  }

  // Step B — Gemini
  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI service is not configured' });
    return;
  }

  try {
    const context = await buildReportContext({ activityId, includeParticipants: true, maxParticipants: 200 });
    if (!context) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    // Cap context payload — drop participant list if too large
    let contextJson = JSON.stringify(context);
    if (contextJson.length > 60_000 && context.participants) {
      context.participants = context.participants.slice(0, 50);
      contextJson = JSON.stringify(context);
    }
    if (contextJson.length > 60_000) {
      contextJson = contextJson.slice(0, 60_000);
    }

    const report = await askGemini(safeMessage, contextJson, safeLang, safeHistory);
    res.json({
      kind: 'custom',
      summary: report.summary,
      table: report.table ?? null,
      activityName: activity.name,
    });
  } catch (err) {
    console.error('Report assistant error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ═══════════════════════════════════════════════
// ─── POST /download — XLSX from custom table ───
// ═══════════════════════════════════════════════

router.post('/download', async (req: Request, res: Response) => {
  const { activityId, title, summary, table, format } = req.body as {
    activityId?: string;
    title?: string;
    summary?: string;
    table?: { title?: string; columns?: string[]; rows?: (string | number)[][] } | null;
    format?: 'xlsx' | 'csv';
  };

  if (!activityId || !Types.ObjectId.isValid(activityId)) {
    res.status(400).json({ error: 'Invalid activityId' });
    return;
  }
  const activity = await Activity.findById(activityId).lean();
  if (!activity || !customerOwnsDoc(req, activity)) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const safeFormat = format === 'csv' ? 'csv' : 'xlsx';
  const safeTitle = (title || table?.title || 'AI Report').slice(0, 80);
  const safeName = activity.name.replace(/[^a-zA-Z0-9֐-׿]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}_AI_${dateStr}.${safeFormat}`;
  const asciiName = `${safeName.replace(/[^\x20-\x7E]/g, '_')}_AI_${dateStr}.${safeFormat}`;

  if (safeFormat === 'csv') {
    const lines: string[] = [];
    lines.push(safeTitle);
    if (summary) {
      lines.push('');
      summary.split('\n').forEach((l) => lines.push(escapeCsvCell(l)));
    }
    if (table && Array.isArray(table.columns) && Array.isArray(table.rows)) {
      lines.push('');
      lines.push(table.columns.map(escapeCsvCell).join(','));
      for (const row of table.rows) {
        lines.push(row.map((c) => escapeCsvCell(String(c ?? ''))).join(','));
      }
    }
    const csv = '﻿' + lines.join('\n'); // BOM for Hebrew Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(csv);
    return;
  }

  // XLSX
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YOOZ';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Report');
  summarySheet.views = [{ rightToLeft: true }];
  summarySheet.addRow([safeTitle]);
  summarySheet.getRow(1).font = { bold: true, size: 16 };
  summarySheet.addRow([`${activity.name} (${activity.code})`]);
  summarySheet.addRow([new Date().toISOString().slice(0, 10)]);
  summarySheet.addRow([]);
  if (summary) {
    for (const line of summary.split('\n')) {
      summarySheet.addRow([line]);
    }
  }
  summarySheet.columns = [{ width: 100 }];

  if (table && Array.isArray(table.columns) && table.columns.length > 0 && Array.isArray(table.rows)) {
    const dataSheet = workbook.addWorksheet(table.title?.slice(0, 28) || 'Data');
    dataSheet.views = [{ rightToLeft: true }];
    dataSheet.addRow(table.columns);
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E4F8' },
    };
    for (const row of table.rows) {
      dataSheet.addRow(row);
    }
    dataSheet.columns = table.columns.map(() => ({ width: 22 }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const out = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(out);
});

function escapeCsvCell(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default router;
