/**
 * Admin Help Assistant — how-to chatbot for the admin dashboard.
 *
 * POST /api/admin/help-assistant/chat
 * Admin JWT required. Uses Gemini with embedded admin knowledge.
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';

const router = Router();
router.use(authenticateAdmin, requireRole('admin', 'super_admin', 'customer'));

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

const FALLBACK = {
  en: 'I can help with admin tasks like creating activities, configuring games, viewing statistics, and exporting data. Try asking "How do I create an activity?" or pick a suggestion chip.',
  he: 'אני יכול לעזור במשימות ניהול כמו יצירת פעילויות, הגדרת משחקים, צפייה בדוחות וייצוא נתונים. נסו לשאול "איך יוצרים פעילות?" או לבחור אחת מההצעות.',
};

function buildSystemPrompt(lang: 'en' | 'he'): string {
  const langName = lang === 'he' ? 'Hebrew' : 'English';

  return `You are "DumbDumbBot", a friendly admin help assistant for the Yooz platform admin dashboard.
Your job is to answer HOW-TO questions for admins — step-by-step instructions for using the dashboard.
Respond ONLY in ${langName}. Be concise (2-6 short steps or bullet points). Use the exact Hebrew/English UI labels from the docs below.
Do NOT answer participant/player questions. Do NOT invent features not listed below.
If unsure, say what you do know and suggest checking the Tutorials tab (סרטוני הדרכה).

ADMIN DASHBOARD OVERVIEW (/admin/dashboard):
Tabs: Activities (פעילויות), Statistics (דוחות), Stations (תחנות), Library (ספרייה), Portals (פורטלים), Users (משתמשים), Tutorials (סרטוני הדרכה).

CREATE ACTIVITY:
1. Dashboard → Activities tab → "Create Activity" (צור פעילות)
2. Step 1 — Basic: activity name (required), login fields (name/email/phone), connection type (single/group/portal), optional groups, Google sync
3. Step 2 — Module: pick module type (story/mission/continuous), add items from Games/Stations/Missions tabs, drag to reorder, assign groups
4. Optional: opening splash, scheduling (start/end dates), popup messages, custom guidelines, continuous activity + portal
5. Submit — needs name + at least 2 items

CONFIGURE GAMES (/admin/games/new or Stations tab → Games):
Game types: Order, Trivia, Puzzle, True/False, Ball Game, Trash Sort.
Shared fields: name, description, customer, theme, tags, instructions, hint toggle.
Save via the save button at bottom. Use dice icon for random test data.

CONFIGURE STATIONS (/admin/stations/new):
Types: Text, Video, Image, Collage, Feedback.
Shared: name, description, customer, theme, tags. Upload media via file upload button.

STATISTICS (/admin/dashboard → Statistics / דוחות):
- Overview: global KPIs, timeline, activities table
- Select activity for per-activity analytics: Overview, Funnel, Items, Groups, Export tabs
- Export tab: download Participants, Scores, Progress as Excel
- AI report assistant (purple AI button on activity stats) for custom reports

PORTALS (/admin/dashboard → Portals):
Create portal for public display screens. Set code, login config, link to activities.

LIBRARY: reusable media assets for activities.

USERS: manage admin users (super_admin only for some actions).

EDIT EXISTING: click a row in Activities/Games/Stations tables to open edit page.

ACTIVITY STATUS: Live (פעיל) vs Preview (תצוגה מקדימה). Preview = test mode, not public.

Keep answers practical. Mention navigation paths like "Go to פעילויות → צור פעילות".`;
}

interface HistoryEntry {
  from: 'bot' | 'user';
  text: string;
}

async function askGemini(
  message: string,
  lang: 'en' | 'he',
  history: HistoryEntry[],
  route?: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const contextNote = route ? `\n\nUser is currently on page: ${route}` : '';

  const priorTurns = history.slice(-6).map((h) => ({
    role: h.from === 'bot' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }));

  const body = {
    contents: [
      ...priorTurns,
      { role: 'user', parts: [{ text: message + contextNote }] },
    ],
    systemInstruction: { parts: [{ text: buildSystemPrompt(lang) }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty Gemini response');
    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/chat', async (req: Request, res: Response) => {
  const adminKey = req.admin?.email || req.ip || 'unknown';
  if (isRateLimited(adminKey)) {
    res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    return;
  }

  const { message, history, lang, context } = req.body as {
    message?: string;
    history?: HistoryEntry[];
    lang?: string;
    context?: { route?: string };
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const safeLang: 'en' | 'he' = lang === 'he' ? 'he' : 'en';
  const safeMessage = message.trim().slice(0, 800);
  const safeHistory: HistoryEntry[] = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h && typeof h.text === 'string' && (h.from === 'bot' || h.from === 'user'),
        )
        .slice(-10)
    : [];
  const route =
    context && typeof context.route === 'string' ? context.route.slice(0, 200) : undefined;

  if (!GEMINI_API_KEY) {
    res.json({ response: FALLBACK[safeLang], source: 'fallback' });
    return;
  }

  try {
    const response = await askGemini(safeMessage, safeLang, safeHistory, route);
    res.json({ response, source: 'gemini' });
  } catch (err) {
    console.error('Admin help assistant error:', err);
    res.json({ response: FALLBACK[safeLang], source: 'fallback' });
  }
});

export default router;
