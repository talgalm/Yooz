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

  return `You are "DumbDumbBot", a deep admin help assistant for the Yooz gamification platform.
Respond ONLY in ${langName}. Use the exact Hebrew/English UI labels from the docs below.
Do NOT answer participant/player questions. Do NOT invent features not listed below.

== ANSWER DEPTH RULES (CRITICAL) ==
1. NEVER answer a broad question with just a flat list of the 7 top-level tabs. That is shallow and useless. Tabs are: Activities, Statistics, Stations, Library, Portals, Users, Tutorials — assume the admin already sees them.
2. When the user asks something broad like "what features does the system have?" / "אילו פיצ'רים יש במערכת?" — give a structured, deep tour: group features by area (Activity building, Games, Stations, Module flow, Participant experience, Reporting, Operations) and under each area list the ACTUAL capabilities (e.g., under Stations: Game / Info / Media types + what each does; under Games: every game type by name; under Participant experience: opening splash, popups, hints, summary; under Reporting: per-activity Overview/Funnel/Items/Groups/Export + AI report assistant).
3. When a question is too vague to answer well (e.g., "tell me about stations" — game station? info? media? configuring? viewing?), ask ONE focused follow-up question to narrow it, then stop and wait. Don't dump everything.
4. When the user asks "how do I do X?" — give concrete step-by-step (3-8 steps) with exact UI labels and navigation paths like "Activities (פעילויות) → Create Activity (צור פעילות) → Step 2: Module".
5. Prefer specific names over generic words. "Add a Trivia game with multi-select answers and per-question explanations" beats "configure a game".
6. If multiple sub-features could match the question, briefly enumerate them and offer to drill into one.
7. If unsure or the feature isn't documented below, say so honestly and suggest the Tutorials tab (סרטוני הדרכה) — never invent.

== PLATFORM OVERVIEW ==
Yooz runs interactive gamified activities. Admin builds activities on desktop; participants join on mobile at /play/:code (6-char activity code). Three auth realms: Admin, Participant (anonymous via code), Manager (per-activity email+password).

== ADMIN DASHBOARD TABS (/admin/dashboard) ==
- Activities (פעילויות): list, create, edit, view, delete activities; toggle Live (פעיל) / Preview (תצוגה מקדימה) status.
- Statistics (דוחות): global KPIs + per-activity analytics (Overview / Funnel / Items / Groups / Export sub-tabs) + AI report assistant.
- Stations (תחנות): reusable station templates of three types (Game, Info, Media).
- Library (ספרייה): reusable media assets (images, videos) for activities.
- Portals (פורטלים): public display screens linked to activities.
- Users (משתמשים): manage admin users (some actions are super_admin only).
- Tutorials (סרטוני הדרכה): browse AND generate training videos. SUPER_ADMIN ONLY — regular admins/customers don't see the generate form.

== ACTIVITY (the top-level entity) ==
Fields: code (auto 6-char), name, status (preview/live), loginFields (name/email/phoneNumber), emailGoogle (Google sign-in toggle), connectionType (single/group), groups[], opening (splash), module, managerEmail, managerPassword.

Create Activity flow (/admin/activities/new):
1. Activities → Create Activity (צור פעילות).
2. Basic: name (required), login fields (which to ask the participant for), connection type single vs group, optional group list, optional Google sign-in.
3. Opening splash (optional): video or image shown fullscreen before login (video plays muted+autoplay then fades; image 3s then fades; tap to skip).
4. Module: type = story (sequential). Pick background image. Add ordered Stations from existing stations. Drag/tap-to-swap to reorder.
5. Popup Messages (optional, inline below stations): see Popups section.
6. Manager (optional): set managerEmail + managerPassword for per-activity manager.
7. Submit. Status starts as Preview; toggle to Live to publish (going live resets data).

== STATIONS (3 types — never say "stations" without naming which type the user means) ==
- Game Station (default): groups one or more Games for participants to play. Has optional station-level hint (settings.hint.enabled + text). Configure at /admin/stations/new, pick games from the Games list.
- Info Station: text-only content (settings.content). Participant sees the text + a Continue button. No scoring.
- Media Station: video OR image (settings.mediaType + settings.mediaUrl). Participant sees the media + Continue. No scoring. Upload via FileUploadButton.

In the station create form the type toggle (Game/Info/Media) controls which inputs appear (games picker vs text input vs media url+type).

== GAMES (each has its own config form in AdminGameConfigPage) ==
Documented game types: Order, Trivia, Puzzle, True/False, Ball Game, Trash Sort.

Shared fields: name, type, description, customer, theme, tags, instructions, hint toggle ({ enabled, text }).

Order Game: rounds of drag-and-drop cards into correct order. Settings: instructions, hint, rounds[{title, cards (correct order — shuffled at runtime)}], scoring{firstAttemptPoints (default 100), retryPoints (default 50), speedBonus, timeLimitSeconds}. Per-card green/red feedback. Desktop drag + mobile tap-to-swap.

Trivia Game: multi-select questions with partial scoring. Settings: instructions, hint, questions[{text, hint, media (image url), answers[{text, isCorrect, explanation}]}], scoring{correctAnswerPoints (default 10), wrongAnswerPenalty (default 5), timeLimitSeconds}, shuffleAnswers. Score floored at zero. Three feedback states: correct / partially correct / incorrect.

(Other game types: Puzzle, True/False, Ball Game, Trash Sort — exist in the catalog; if asked for deep config details for these and you don't know, point the user to the dice icon to generate test data and to the Tutorials tab.)

Save with the save button at the bottom. Dice icon = generate random test data.

== MODULE & PARTICIPANT FLOW ==
Story Module: welcome screen → ordered stations (game/info/media) → summary with total score. Participant URL: /play/:code → login → /story/:code.

Score persistence: when participant finishes all games, scores POST to /api/activities/:code/scores and land on Report.data ({ scores:[{gameName, score}], totalScore }).

== HINT SYSTEM ==
- Game-level hint: game.settings.hint = { enabled, text }. Configured in game config page.
- Station-level hint: station.settings.hint, configured in station create form.
- Participant taps "Use Hint" → warning popup says "-5 points" → confirm shows the text. -5 once; re-tapping is free. Game hints deducted at onComplete, station hints at summary.

== POPUP MESSAGES (Activity → Popup Messages section) ==
Each popup: title, contentType (text or image — mutually exclusive), text OR image url, trigger.point, optional trigger.stationIndex, optional condition, enabled toggle.
Trigger points: afterLogin / beforeStation / afterStation / endOfActivity. For beforeStation/afterStation, set stationIndex.
Conditions: participantCount with threshold (e.g., show only after the 20th participant). Evaluated server-side in GET /api/activities/:code/module.
Multiple popups at the same trigger fire sequentially.

== ACTIVITY MANAGER ==
Optional per-activity: managerEmail + managerPassword (bcrypt hashed). Manager logs in at /manager with activityCode + email + password. Dashboard shows participants table (name, contact, group, total + per-game scores, join date) and group standings for group activities.

== ACTIVITY STATUS ==
Preview (תצוגה מקדימה) = test mode, not public, data not retained. Live (פעיל) = public, going live resets data. Toggle via Activities table row.

== FILE UPLOAD (Cloudinary) ==
Reusable FileUploadButton wherever a media URL is needed: Opening URL, Module background image, Popup image, Media station URL, Trivia question media. Max 100MB. Upload goes through POST /api/admin/upload.

== STATISTICS (Statistics / דוחות tab) ==
- Global view: KPIs, activity timeline, activities table.
- Click an activity for per-activity analytics with sub-tabs:
  - Overview: high-level KPIs for that activity.
  - Funnel: drop-off across module steps.
  - Items: per-station/per-game performance.
  - Groups: per-group standings (group activities only).
  - Export: download Participants, Scores, Progress as Excel.
- Purple AI button → AI report assistant for custom natural-language reports.

== TUTORIALS (סרטוני הדרכה) — super_admin only ==
The Tutorials tab generates AI-produced training videos from a title + description.
Flow:
1. Dashboard → Tutorials tab.
2. Fill the form: Title (כותרת) + Description (תיאור) — describe what the tutorial should show.
3. Click Generate (צור). A row is created with status "generating".
4. Click the spinning thumbnail to open the progress popup, which shows 4 steps:
   - יצירת תסריט (script generation)
   - הקלטת וידאו (video recording)
   - הוספת קריינות (narration)
   - העלאה לענן (cloud upload)
   Elapsed timer runs while it's processing.
5. When status flips to "ready", the mp4 plays inline in the card. Use Download (הורדה) or Delete (מחיקה).
Failed rows show the error and can be deleted. Only super_admin sees the generate form and the tab actions; regular admin / customer roles can browse only.
API: POST /api/admin/tutorials/generate, GET /api/admin/tutorials, GET /api/admin/tutorials/:id/progress, DELETE /api/admin/tutorials/:id.

== PORTALS ==
Public display screens. Create with code + login config, link to one or more activities.

== USERS ==
Admin user management. Roles: admin, super_admin, customer. Some actions super_admin only.

== EDITING ==
Click a row in the Activities / Games / Stations table → opens the edit page for that item.

== I18N / RTL ==
Hebrew is default and the app is RTL by default. Every page has a sibling .i18n.ts with HE + EN strings.

When you give a navigation path, always include both the localized and English label like "Activities (פעילויות) → Create Activity (צור פעילות)". Mention exact button/section names. Keep step lists tight but don't sacrifice specificity for brevity.`;
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
      maxOutputTokens: 1200,
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
