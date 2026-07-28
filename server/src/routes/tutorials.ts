import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { Tutorial } from '../models';

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Project root — walkthroughs dir is at the repo root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// ─── Load UI map and example specs for Gemini context ───

function loadFileIfExists(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
  } catch { return ''; }
}

// A small, diverse example set. The walkthroughs dir is mostly create-* specs, and feeding
// all of them biased every generation toward "create activity" regardless of the request.
// These five cover distinct flow shapes (login, navigation, read-only viewing, a create, and
// search) so Gemini learns the style + helper patterns without anchoring on one flow.
const EXAMPLE_SPECS = [
  '01-admin-login.spec.ts',
  '06-navigate-dashboard-tabs.spec.ts',
  '05-view-statistics.spec.ts',
  '02-create-activity.spec.ts',
  '22-search-content.spec.ts',
];

function loadExampleSpecs(): string {
  const walkthroughsDir = path.join(PROJECT_ROOT, 'walkthroughs');
  try {
    const all = readdirSync(walkthroughsDir)
      .filter((f) => f.endsWith('.spec.ts') && !f.startsWith('dynamic-'));
    const chosen = EXAMPLE_SPECS.filter((f) => all.includes(f));
    const files = chosen.length ? chosen : all.sort().slice(0, 5);
    return files.map((f) => {
      const content = readFileSync(path.join(walkthroughsDir, f), 'utf-8');
      const name = f.replace(/^\d+-/, '').replace('.spec.ts', '').replace(/-/g, ' ');
      return `--- Example: ${name} ---\n${content}`;
    }).join('\n\n');
  } catch { return ''; }
}

function buildSystemPrompt(): string {
  const uiMap = loadFileIfExists(path.join(PROJECT_ROOT, 'walkthroughs', 'ui-map.md'));
  const examples = loadExampleSpecs();

  return `You are a Playwright spec generator for the Yooz system.
The user (in the next message) describes, in Hebrew or English, the walkthrough video they want.
You must output ONLY valid TypeScript code — a complete Playwright test file. No markdown fences, no explanation, just code.

=== #1 PRIORITY: MATCH THE REQUEST ===
Build a walkthrough for EXACTLY the flow the user asked for, and nothing else.
- If they ask to navigate tabs, the video navigates tabs. If they ask to view statistics, it views statistics. If they ask about the library, it shows the library.
- Do NOT default to a "create activity" walkthrough. Only create/edit/delete something if the user explicitly asked to.
- Pick the ONE example below whose flow is closest to the request and adapt it; ignore the others.
- Log in first ONLY if the requested flow needs an authenticated admin page (most do). Keep login to the 4 quick lines shown in the login example — it is a means to reach the requested screen, not the subject of the video.
The title/description are the source of truth for WHAT the video shows.

Available imports from './helpers':
  - startNarration() — call once at the start
  - showCaption(page, text, durationMs?) — show a Hebrew caption overlay (default 3500ms). Also records timestamp for voice narration.
  - highlightAndClick(page, selector, caption?) — highlight element, show caption, then click. Resilient: if the selector matches nothing it skips the click but still narrates.
  - highlightAndFill(page, selector, value, caption?) — highlight element, type slowly, show caption. Resilient like highlightAndClick.
  - pause(page, ms?) — wait (default 2000ms)
  - saveNarrationLog(path) — save narration JSON. Call at the end.

RESILIENCE — the video MUST be able to run to the end even if a step's element is missing:
- PREFER the helpers (highlightAndClick / highlightAndFill) for every interaction — they never throw on a missing element.
- If you must use a raw Playwright call (page.click / page.fill / page.goto / page.waitForURL), you MUST append .catch(() => {}) so it can never abort the test. Example: await page.click('...').catch(() => {});
- The only raw calls without .catch allowed are the 4 login lines and the very first page.goto.

OTHER RULES:
1. Always start with: import { test } from '@playwright/test'; and import the helpers you use.
2. Always call startNarration() first.
3. Always call saveNarrationLog('NARRATION_OUTPUT_PATH') at the very end (narration is also auto-saved, but keep this line).
4. All captions MUST be in Hebrew.
5. Use pause(page, 1500) between major actions so the video is watchable.
6. Keep the total video under 60 seconds — 4–8 focused steps, all on the requested flow.
7. Use ONLY selectors documented in the UI MAP below. Do NOT invent selectors.
8. For tab/button switching, use both English and Hebrew text: button:has-text("Stations"), button:has-text("תחנות").
9. NEVER chain .first()/.last() on a string selector passed to highlightAndClick/highlightAndFill — they call .first() internally.

=== COMPLETE UI MAP (routes, selectors, Hebrew labels, navigation flows) ===

${uiMap}

=== END UI MAP ===

=== EXAMPLE SPECS (reference for STYLE and helper patterns — pick the closest ONE to adapt) ===

${examples}

=== END EXAMPLES ===

Output ONLY the TypeScript code for the requested walkthrough, nothing else.`;
}

// ─── Gemini LLM: free text → Playwright spec ───

async function askGemini(userText: string, systemPrompt?: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  // Put the big instruction set in systemInstruction and keep the user request as its own
  // turn. Structurally separating them stops the request from being "lost" at the tail of a
  // huge prompt and drifting toward whatever the examples show.
  const body: {
    contents: { role: string; parts: { text: string }[] }[];
    systemInstruction?: { parts: { text: string }[] };
    generationConfig: { temperature: number; maxOutputTokens: number };
  } = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  // Retry up to 3 times with exponential backoff for rate limits (429)
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

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

      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        clearTimeout(timeout);
        const waitSec = Math.pow(2, attempt + 1) * 5; // 10s, 20s, 40s
        console.log(`[Gemini] ${res.status} error. Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Gemini API error: ${res.status} ${errBody.slice(0, 200)}`);
      }

      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty Gemini response');
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Gemini rate limited after all retries');
}

// ─── Deterministic target hint: grounds the (weak) model on the requested screen ───

/**
 * Map the request's keywords to a concrete "which screen" instruction. The lite Gemini model
 * tends to ignore a short request buried under a big system prompt and drift to a generic
 * flow (create-activity / library). Injecting the detected target — the exact tab text and
 * route — up front keeps the generated walkthrough on the screen the user actually asked for.
 * Returns '' when no clear target is detected (open-ended request → let the model decide).
 *
 * NFC-normalize + match with String.includes rather than a regex: esbuild (via tsx) mangles
 * non-ASCII characters inside REGEX literals, so Hebrew /…/ patterns silently never match at
 * runtime — string literals survive transpilation intact. includes() also gives substring
 * matching (משתמש ⊂ משתמשים).
 */
function detectTargetHint(title: string, description: string): string {
  const text = (title + ' ' + description).normalize('NFC').toLowerCase();
  const has = (words: string[]) => words.some((w) => text.includes(w));

  const wantsDuplicate = has(['duplicate', 'clone', 'שכפול', 'שכפל', 'העתק', 'כפיל']);
  const wantsParticipant = has(['play', 'לשחק', 'משתתף', 'להיכנס לפעילות', 'סריקת', 'qr']);
  const wantsSearch = has(['search', 'חיפוש', 'לחפש', 'למצוא']);
  const wantsUsers = has(['user', 'משתמש', 'הרשאות']);
  const wantsStats = has(['statistic', 'report', 'סטטיסטיק', 'אנליטיק', 'נתונים', 'דוחות']);
  const wantsLibrary = has(['library', 'ספרייה', 'ייבוא', 'ייצוא', 'שחזור']);
  const wantsStations = has(['station', 'תחנה', 'תחנות']);
  const wantsGames = has(['game', 'משחק', 'טריוויה', 'פאזל']);
  const wantsCreate = !wantsDuplicate && has(['create', 'ליצור', 'יצירה', 'יצירת', 'צור', 'פעילות חדשה']);
  const wantsTabs = has(['tab', 'לשוני', 'ניווט', 'סיור', 'navigat']);

  const target = (name: string, extra: string) =>
    `TARGET SCREEN: ${name}. After login, ${extra} The whole walkthrough must stay on this screen — do NOT drift to "create activity", "library/export", or any other flow the user did not ask for.`;

  if (wantsParticipant) return `TARGET: the participant play flow (go to /play/<code>, enter a name, start). Do NOT show the admin dashboard.`;
  if (wantsSearch) return target('the Activities tab search', 'use the search box in the activities list to find an activity by name.');
  if (wantsUsers) return target('the Users tab', 'click button:has-text("Users"), button:has-text("משתמשים") and show user/permission management.');
  if (wantsStats) return target('the Reports/Statistics tab', 'click button:has-text("Statistics"), button:has-text("דוחות") and show the statistics.');
  if (wantsLibrary) return target('the Library tab', 'click button:has-text("Library"), button:has-text("ספרייה") and show the imported content.');
  if (wantsStations) return target('the Stations tab', 'click button:has-text("Stations"), button:has-text("תחנות") and show stations/games management.');
  if (wantsGames) return target('the Games management screen', 'open the Stations tab, then the Games sub-view, and show the games.');
  if (wantsDuplicate) return target('an existing item you duplicate', 'open the row actions and use Duplicate / שכפול.');
  if (wantsTabs) return target('the dashboard tabs', 'click through the top tabs (Stations/תחנות, Library/ספרייה, Statistics/דוחות, Users/משתמשים) one by one.');
  if (wantsCreate) return target('the Create Activity flow', 'click Create Activity / צור פעילות and fill the form.');
  return '';
}

// ─── Fallback: keyword-based template when Gemini is unavailable ───

function generateFallbackSpec(title: string, description: string, narrationJsonPath: string): string {
  const text = (title + ' ' + description).toLowerCase();

  // Detect what the user wants based on keywords
  const wantsLogin = /login|התחברות|כניסה/.test(text);
  const wantsDuplicate = /duplicate|copy|clone|שכפ|העתק|מעתיק|העתקה|כפיל/.test(text);
  const wantsCreate = !wantsDuplicate && /create|יצירה|יצירת|ליצור|צור|פעילות חדשה/.test(text);
  const wantsLibrary = /library|ספרייה|ייבוא|ייצוא|שחזור/.test(text);
  const wantsStats = /statistic|סטטיסטיק|אנליטיק|נתונים|דוחות/.test(text);
  const wantsGames = /game|משחק|משחקים/.test(text);
  const wantsStations = /station|תחנה|תחנות/.test(text);
  const wantsUsers = /user|משתמש|משתמשים/.test(text);
  const wantsParticipant = /play|לשחק|משתתף|פעילות מסוימת|נכנסים לפעילות|להיכנס לפעילות/.test(text);
  const duplicateTarget: 'station' | 'activity' = wantsDuplicate && wantsStations ? 'station' : 'activity';

  const steps: string[] = [];

  // Participant flow — completely different path
  if (wantsParticipant) {
    steps.push(`
  // Navigate to a demo activity
  await page.goto('/play/DEMO');
  await pause(page, 2000);
  await showCaption(page, 'ברוכים הבאים! זהו מסך הכניסה לפעילות');
  await pause(page, 1500);

  // Fill participant name
  const nameInput = page.locator('input').first();
  await nameInput.scrollIntoViewIfNeeded().catch(() => {});
  await nameInput.click().catch(() => {});
  await nameInput.fill('משתתף לדוגמה').catch(() => {});
  await showCaption(page, 'מזינים את השם ולוחצים התחברות');
  await pause(page, 1500);

  // Click submit
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await pause(page, 3000);

  await showCaption(page, 'לאחר ההתחברות מגיעים למפת הפעילות');
  await pause(page, 2000);
  await showCaption(page, 'כאן רואים את כל המשחקים והתחנות');
  await pause(page, 1500);
  await showCaption(page, 'לוחצים על כרטיס כדי להתחיל לשחק');
  await pause(page, 2000);`);

    steps.push(`
  await pause(page, 2000);`);

    return `import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

test('${title.replace(/'/g, "\\'")}', async ({ page }) => {
  startNarration();
${steps.join('\n')}

  saveNarrationLog('${narrationJsonPath.replace(/\\/g, '/')}');
});
`;
  }

  // Admin flows — start with login
  steps.push(`
  // Login
  await page.goto('/admin/login');
  await pause(page, 1500);
  await showCaption(page, 'ברוכים הבאים למערכת הניהול של Yooz');
  await highlightAndFill(page, 'input[type="email"], input[placeholder*="email" i]', 'admin@yooz.com', 'הזינו את כתובת האימייל שלכם');
  await highlightAndFill(page, 'input[type="password"]', 'admin123', 'הזינו את הסיסמה');
  await highlightAndClick(page, 'button[type="submit"]', 'לחצו על כפתור ההתחברות');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'נכנסתם בהצלחה ללוח הבקרה');`);

  if (wantsDuplicate) {
    if (duplicateTarget === 'station') {
      steps.push(`
  // Duplicate station
  await showCaption(page, 'נכנסים ללשונית תחנות');
  await page.click('button:has-text("Stations"), button:has-text("תחנות")').catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'בכל שורה יש כפתור פעולות (אייקון עיפרון)');
  await pause(page, 1500);
  await page.locator('button[aria-label="Actions"], button[aria-label="פעולות"]').first().click().catch(() => {});
  await pause(page, 1500);
  await showCaption(page, 'לוחצים על שכפול ליצירת עותק של התחנה');
  await page.click('button:has-text("Duplicate"), button:has-text("שכפול")').catch(() => {});
  await pause(page, 2500);
  await showCaption(page, 'נוצרה תחנה חדשה בשם "(עותק)" — אפשר לערוך אותה כעת');
  await pause(page, 2000);`);
    } else {
      steps.push(`
  // Duplicate activity
  await showCaption(page, 'בלשונית פעילויות רואים את כל הפעילויות');
  await pause(page, 1500);
  await showCaption(page, 'בכל שורה יש כפתור פעולות (אייקון עיפרון)');
  await pause(page, 1500);
  await page.locator('button[aria-label="Actions"], button[aria-label="פעולות"]').first().click().catch(() => {});
  await pause(page, 1500);
  await showCaption(page, 'לוחצים על שכפול ליצירת עותק של הפעילות');
  await page.click('button:has-text("Duplicate"), button:has-text("שכפול")').catch(() => {});
  await pause(page, 3000);
  await showCaption(page, 'נוצרה פעילות חדשה בשם "(עותק)" עם קוד חדש במצב תצוגה מקדימה');
  await pause(page, 2000);`);
    }
  }

  if (wantsCreate) {
    steps.push(`
  // Create activity
  await showCaption(page, 'לוחצים על צור פעילות');
  await page.click(':text("Create Activity"), :text("צור פעילות")').catch(() => {});
  await page.waitForURL('**/activities/new', { timeout: 10000 }).catch(() => page.goto('/admin/activities/new'));
  await pause(page, 1500);
  await highlightAndFill(page, 'input[placeholder*="Activity Name"], input[placeholder*="שם הפעילות"]', 'הרפתקה בטבע', 'נותנים שם לפעילות');
  await showCaption(page, 'אפשר להגדיר הגדרות נוספות — סוג מודול, שדות כניסה, ערכת נושא');
  await showCaption(page, 'עוברים לשלב 2 — בחירת משחקים ותחנות');
  await page.click('button:has-text("Select Games"), button:has-text("בחירת משחקים")').catch(() => page.click('button:has-text("Next"), button:has-text("הבא")').catch(() => {}));
  await pause(page, 1500);
  await showCaption(page, 'בוחרים משחקים ותחנות מהרשימה');
  await pause(page, 2000);`);
  }

  if (wantsLibrary) {
    steps.push(`
  // Library
  await showCaption(page, 'נכנסים ללשונית ספרייה');
  await page.click(':text("Library"), :text("ספרייה")').catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'כאן רואים את כל התוכן שיובא — משחקים ותחנות');
  await pause(page, 1500);
  await showCaption(page, 'לוחצים על ייצוא כדי להעביר פריט למערכת החדשה');
  await pause(page, 1500);`);
  }

  if (wantsStats) {
    steps.push(`
  // Statistics
  await showCaption(page, 'נכנסים ללשונית סטטיסטיקות');
  await page.click(':text("Statistics"), :text("סטטיסטיקות")').catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'כאן רואים סקירה כללית — משתתפים, השלמות, ציונים');
  await pause(page, 2000);
  await showCaption(page, 'לוחצים על פעילות כדי לראות נתונים מפורטים');
  await pause(page, 1500);`);
  }

  if (wantsGames && !wantsCreate && !wantsLibrary) {
    steps.push(`
  // Games tab
  await showCaption(page, 'נכנסים ללשונית תחנות ומשחקים');
  await page.click(':text("Stations"), :text("תחנות")').catch(() => {});
  await pause(page, 1000);
  await page.click(':text("Games"), :text("משחקים")').catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'כאן רואים את כל המשחקים — אפשר ליצור חדש או לערוך קיים');
  await pause(page, 1500);`);
  }

  if (wantsUsers) {
    steps.push(`
  // Users
  await showCaption(page, 'נכנסים ללשונית משתמשים');
  await page.click(':text("Users"), :text("משתמשים")').catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'כאן מנהלים את המשתמשים במערכת — אפשר להוסיף, לערוך או למחוק');
  await pause(page, 1500);`);
  }

  // If nothing specific matched, just show the dashboard
  if (!wantsCreate && !wantsLibrary && !wantsStats && !wantsGames && !wantsStations && !wantsUsers && !wantsLogin && !wantsDuplicate) {
    steps.push(`
  await showCaption(page, 'זהו לוח הבקרה הראשי — כאן מנהלים את כל המערכת');
  await pause(page, 2000);
  await showCaption(page, 'בלשוניות למעלה אפשר לנווט בין פעילויות, תחנות, ספרייה וסטטיסטיקות');
  await pause(page, 2000);`);
  }

  steps.push(`
  await pause(page, 2000);`);

  return `import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

test('${title.replace(/'/g, "\\'")}', async ({ page }) => {
  startNarration();
${steps.join('\n')}

  saveNarrationLog('${narrationJsonPath.replace(/\\/g, '/')}');
});
`;
}

/**
 * Force the './helpers' import to include every helper, so a spec that CALLS a helper it
 * forgot to import (Gemini frequently omits highlightAndFill) doesn't crash at runtime with
 * "ReferenceError: X is not defined". Importing unused helpers is harmless.
 */
function normalizeHelperImport(spec: string): string {
  const canonical = `import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';`;
  const helpersImportRe = /import\s*\{[^}]*\}\s*from\s*['"]\.\/helpers['"]\s*;?/;
  if (helpersImportRe.test(spec)) {
    return spec.replace(helpersImportRe, canonical);
  }
  // No helpers import present — add one right after the @playwright/test import.
  const pwImportRe = /(import\s*\{[^}]*\}\s*from\s*['"]@playwright\/test['"]\s*;?)/;
  if (pwImportRe.test(spec)) {
    return spec.replace(pwImportRe, `$1\n${canonical}`);
  }
  return spec;
}

/**
 * Extract clean TypeScript code from Gemini's response.
 * Handles any leading explanation text before a fenced code block.
 */
function extractCode(raw: string): string {
  const trimmed = raw.trim();

  // Find a fenced code block anywhere in the response (Gemini often adds explanation before it)
  const fenceMatch = trimmed.match(/```(?:typescript|ts)?\r?\n([\s\S]*?)\r?\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Fallback: strip leading/trailing fences directly
  let code = trimmed;
  if (code.startsWith('```')) {
    code = code.replace(/^```(?:typescript|ts)?\r?\n?/, '').replace(/\r?\n?```$/, '');
  }
  return code.trim();
}

// ─── Routes ───

// GET /api/admin/tutorials — list all tutorials
router.get('/', authenticateAdmin, requireRole('super_admin'), async (_req: Request, res: Response) => {
  const tutorials = await Tutorial.find().sort({ createdAt: -1 }).lean();
  res.json({ tutorials });
});

// POST /api/admin/tutorials/generate — LLM generates spec → record → voice → upload
router.post('/generate', authenticateAdmin, requireRole('super_admin'), async (req: Request, res: Response) => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }

  // Create tutorial record
  const tutorial = await Tutorial.create({
    title,
    description,
    status: 'pending',
    createdBy: req.admin!.email,
  });

  // Return immediately — generation happens in background
  res.json({ tutorial });

  // --- Background generation ---
  generateVideo(tutorial._id.toString(), title, description).catch((err) => {
    console.error(`Tutorial generation failed for ${tutorial._id}:`, err);
  });
});

// GET /api/admin/tutorials/:id/progress — get tutorial generation progress
router.get('/:id/progress', authenticateAdmin, requireRole('super_admin'), async (req: Request, res: Response) => {
  const tutorial = await Tutorial.findById(req.params.id).lean();
  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }
  res.json({
    status: tutorial.status,
    steps: tutorial.steps || [],
    startedAt: tutorial.startedAt,
    error: tutorial.error,
  });
});

// DELETE /api/admin/tutorials/:id — delete tutorial + Cloudinary asset
router.delete('/:id', authenticateAdmin, requireRole('super_admin'), async (req: Request, res: Response) => {
  const tutorial = await Tutorial.findById(req.params.id);
  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  if (tutorial.publicId) {
    await cloudinary.uploader.destroy(tutorial.publicId, { resource_type: 'video' }).catch(() => {});
  }

  await Tutorial.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ─── Video generation pipeline ───

const STEP_NAMES = [
  'יצירת תסריט',      // Generating spec
  'הקלטת וידאו',      // Recording video
  'הוספת קריינות',    // Adding narration
  'העלאה לענן',       // Uploading
];

async function setStep(tutorialId: string, stepIndex: number, status: 'running' | 'done' | 'failed', detail?: string) {
  const update: Record<string, any> = {
    [`steps.${stepIndex}.status`]: status,
  };
  if (status === 'running') update[`steps.${stepIndex}.startedAt`] = new Date();
  if (status === 'done' || status === 'failed') update[`steps.${stepIndex}.completedAt`] = new Date();
  if (detail !== undefined) update[`steps.${stepIndex}.detail`] = detail;
  await Tutorial.findByIdAndUpdate(tutorialId, { $set: update });
}

async function generateVideo(tutorialId: string, title: string, description: string) {
  // Initialize steps
  const steps = STEP_NAMES.map((name) => ({ name, status: 'pending' as const }));
  await Tutorial.findByIdAndUpdate(tutorialId, { status: 'generating', startedAt: new Date(), steps });

  const baseUrl = process.env.APP_URL || 'http://localhost:5173';
  const safeId = tutorialId.replace(/[^a-zA-Z0-9]/g, '');
  const specFile = path.join(PROJECT_ROOT, 'walkthroughs', `dynamic-${safeId}.spec.ts`);
  const narrationJson = path.join(PROJECT_ROOT, 'walkthrough-videos', `dynamic-${safeId}-narration.json`);
  const videoDir = path.join(PROJECT_ROOT, 'walkthrough-videos');
  // Per-run Playwright output dir. Playwright wipes its outputDir at the start of every run,
  // so concurrent generations sharing one dir stomp each other's freshly recorded videos
  // (ENOENT on upload). An isolated dir per tutorial makes concurrent generation safe.
  const runDir = path.join(videoDir, `run-${safeId}`);

  try {
    // Step 0: Generate the Playwright spec
    await setStep(tutorialId, 0, 'running');
    let specContent: string;

    console.log(`[Tutorial ${safeId}] Asking Gemini to generate spec for: "${description.slice(0, 80)}..."`);
    const hint = detectTargetHint(title, description);
    if (hint) console.log(`[Tutorial ${safeId}] Target hint: ${hint.slice(0, 90)}...`);
    const userRequest = `${hint ? hint + '\n\n' : ''}Generate the Playwright walkthrough spec for EXACTLY this request — build this specific flow, not a different one:\n\nTitle: ${title}\nDescription: ${description}`;
    const rawSpec = await askGemini(userRequest, buildSystemPrompt());
    specContent = extractCode(rawSpec);
    specContent = specContent.replace(/NARRATION_OUTPUT_PATH/g, narrationJson.replace(/\\/g, '/'));
    specContent = normalizeHelperImport(specContent);

    if (!specContent.includes('import') || !specContent.includes('test(')) {
      throw new Error('Gemini returned invalid spec — missing import or test()');
    }
    console.log(`[Tutorial ${safeId}] Gemini spec generated (${specContent.length} chars)`);

    // Syntax-check: write temp file and run Playwright --list to detect compile errors.
    // If it fails, send the errors back to Gemini for one correction attempt.
    const NODE_BIN = process.env.PLAYWRIGHT_NODE_BIN?.trim() || process.execPath;
    // Run Playwright's JS CLI entry directly via node. The node_modules/.bin/playwright
    // shim is a POSIX shell script that `node` can't execute on Windows — cli.js is portable.
    const PW_BIN = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');
    // Playwright treats the positional path as a regex filter matched against test files, so
    // it must be relative with forward slashes. An absolute Windows path (C:\...) reads as an
    // invalid regex and silently matches zero files ("No tests found"). cwd is PROJECT_ROOT.
    const specArg = path.relative(PROJECT_ROOT, specFile).replace(/\\/g, '/');
    writeFileSync(specFile, specContent);
    const listCmd = `"${NODE_BIN}" "${PW_BIN}" test --list --project=walkthroughs "${specArg}"`;
    const { output: listOutput, exitCode: listExit } = await runCommand(listCmd, 30_000);
    if (listExit !== 0) {
      if (/not found|ENOENT|No such file or directory|cannot execute/i.test(listOutput)) {
        try { unlinkSync(specFile); } catch {}
        throw new Error(
          `Playwright syntax-check command failed to start (node: ${NODE_BIN}). ${listOutput
            .slice(-300)
            .trim()}`,
        );
      }

      const errSnippet = listOutput.slice(-800);
      console.log(`[Tutorial ${safeId}] Gemini spec has syntax errors — asking Gemini to fix:\n${errSnippet}`);
      try { unlinkSync(specFile); } catch {}

      // One correction pass: send original spec + compiler errors back to Gemini
      const fixPrompt = `The following TypeScript Playwright spec has compilation errors. Fix ONLY the TypeScript errors and output the corrected spec. Output ONLY the TypeScript code, nothing else.\n\nOriginal spec:\n\`\`\`typescript\n${specContent}\n\`\`\`\n\nCompiler errors:\n${errSnippet}`;
      const fixedRaw = await askGemini(fixPrompt);
      specContent = extractCode(fixedRaw);
      specContent = specContent.replace(/NARRATION_OUTPUT_PATH/g, narrationJson.replace(/\\/g, '/'));

      writeFileSync(specFile, specContent);
      const { output: retryOutput, exitCode: retryExit } = await runCommand(listCmd, 30_000);
      if (retryExit !== 0) {
        console.log(`[Tutorial ${safeId}] Corrected spec still has errors — falling back to keyword template:\n${retryOutput.slice(-600)}`);
        specContent = generateFallbackSpec(title, description, narrationJson);
        writeFileSync(specFile, specContent);
        const { output: fbOutput, exitCode: fbExit } = await runCommand(listCmd, 30_000);
        if (fbExit !== 0) {
          console.log(`[Tutorial ${safeId}] Fallback spec ALSO failed to compile:\n${fbOutput.slice(-600)}`);
          try { unlinkSync(specFile); } catch {}
          throw new Error('Gemini spec has syntax errors — generation aborted');
        }
        console.log(`[Tutorial ${safeId}] Using keyword fallback spec`);
      } else {
        console.log(`[Tutorial ${safeId}] Correction pass succeeded`);
      }
    }

    writeFileSync(specFile, specContent);
    console.log(`[Tutorial ${safeId}] Generated spec:\n${specContent}`);
    await setStep(tutorialId, 0, 'done', 'Gemini AI');

    // Step 1: Run Playwright
    await setStep(tutorialId, 1, 'running');
    console.log(`[Tutorial ${safeId}] Running Playwright...`);
    if (!existsSync(videoDir)) mkdirSync(videoDir, { recursive: true });

    const runDirArg = path.relative(PROJECT_ROOT, runDir).replace(/\\/g, '/');
    const playwrightCmd = `"${NODE_BIN}" "${PW_BIN}" test --reporter=list --project=walkthroughs --output "${runDirArg}" "${specArg}"`;
    const { output: playwrightOutput, exitCode } = await runCommand(playwrightCmd, 600_000, {
      PLAYWRIGHT_BASE_URL: baseUrl,
      // Helpers flush narration here after every caption, so a spec that throws partway
      // still leaves a usable narration file and the video keeps its voiceover.
      NARRATION_OUTPUT: narrationJson,
    });
    console.log(`[Tutorial ${safeId}] Playwright output (exit ${exitCode}):\n${playwrightOutput.slice(-1500)}`);

    // Check for video even if Playwright exited non-zero (partial test may still record)
    const videoFile = findVideoFile(runDir, `dynamic-${safeId}`);
    if (!videoFile) {
      const errDetail = playwrightOutput.slice(-500);
      await setStep(tutorialId, 1, 'failed', errDetail);
      throw new Error(`Playwright failed (exit ${exitCode}) — no video recorded.\n${errDetail}`);
    }
    console.log(`[Tutorial ${safeId}] Video recorded: ${videoFile}`);
    if (exitCode !== 0) {
      console.log(`[Tutorial ${safeId}] ⚠ Playwright exited ${exitCode} but video was recorded — continuing`);
    }
    await setStep(tutorialId, 1, 'done');

    // Step 2: Add voice narration
    await setStep(tutorialId, 2, 'running');
    const outputPath = path.join(videoDir, `tutorial-${safeId}-narrated.mp4`);
    if (existsSync(narrationJson)) {
      console.log(`[Tutorial ${safeId}] Adding voice narration...`);
      const voiceCmd = `npx tsx "${path.join(PROJECT_ROOT, 'walkthroughs', 'add-voice.ts')}" "${videoFile}" "${narrationJson}" "${outputPath}"`;
      const { exitCode: voiceExit } = await runCommand(voiceCmd, 120_000);
      if (voiceExit !== 0) {
        console.log(`[Tutorial ${safeId}] ⚠ Voice narration failed — continuing without it`);
      }
    }
    await setStep(tutorialId, 2, 'done');

    const finalVideoPath = existsSync(outputPath) ? outputPath : videoFile;

    // Step 3: Upload to Cloudinary
    await setStep(tutorialId, 3, 'running');
    console.log(`[Tutorial ${safeId}] Uploading to Cloudinary...`);
    const uploadResult = await uploadToCloudinary(finalVideoPath);
    await setStep(tutorialId, 3, 'done');

    // Done
    await Tutorial.findByIdAndUpdate(tutorialId, {
      status: 'ready',
      videoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      thumbnailUrl: uploadResult.secure_url.replace(/\.\w+$/, '.jpg'),
    });

    console.log(`[Tutorial ${safeId}] ✅ Done! ${uploadResult.secure_url}`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Tutorial ${safeId}] ❌ Error:`, errorMsg);
    await Tutorial.findByIdAndUpdate(tutorialId, {
      status: 'failed',
      error: errorMsg.slice(0, 1000),
    });
  } finally {
    // Cleanup all local files — everything is in Cloudinary (or failed)
    cleanupLocalFiles(safeId, specFile, narrationJson, videoDir, runDir);
  }
}

/**
 * Remove all local files generated for a tutorial (spec, narration, per-run video dir).
 * Scoped to this tutorial's own paths so it never touches a concurrent generation's files.
 */
function cleanupLocalFiles(safeId: string, specFile: string, narrationJson: string, videoDir: string, runDir: string) {
  try { unlinkSync(specFile); } catch {}
  try { unlinkSync(narrationJson); } catch {}
  // Remove narrated mp4
  try { unlinkSync(path.join(videoDir, `tutorial-${safeId}-narrated.mp4`)); } catch {}
  // Remove this run's isolated Playwright output dir (holds the recorded video)
  try { rmSync(runDir, { recursive: true, force: true }); } catch {}
  console.log(`[Tutorial ${safeId}] Local files cleaned up`);
}

/**
 * Find the video file generated by Playwright for a dynamic spec.
 */
function findVideoFile(videoDir: string, prefix: string): string | null {
  if (!existsSync(videoDir)) return null;

  const entries = readdirSync(videoDir, { withFileTypes: true });

  // Look in subdirectories (Playwright creates test-specific folders)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const videoPath = path.join(videoDir, entry.name, 'video.webm');
      if (existsSync(videoPath)) {
        // Check if this directory is related to our spec (by name or by recency)
        if (entry.name.includes(prefix)) return videoPath;
      }
    }
  }

  // Fallback: find most recently created .webm in any subfolder
  let newestFile: string | null = null;
  let newestTime = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const videoPath = path.join(videoDir, entry.name, 'video.webm');
      if (existsSync(videoPath)) {
        const { mtimeMs } = require('fs').statSync(videoPath);
        if (mtimeMs > newestTime) {
          newestTime = mtimeMs;
          newestFile = videoPath;
        }
      }
    }
  }
  return newestFile;
}

function runCommand(
  cmd: string,
  timeoutMs: number,
  extraEnv?: Record<string, string>,
): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    // cwd + env are passed via exec options (cross-platform) rather than baked into the
    // command string with `cd ... &&` / `VAR=value cmd` prefixes, which are POSIX-shell only
    // and break under cmd.exe on Windows. stdout/stderr are captured separately below, so no
    // `2>&1` redirect is needed either.
    exec(
      cmd,
      {
        cwd: PROJECT_ROOT,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      },
      (error, stdout, stderr) => {
        const output = (stdout || '') + (stderr || '');
        const exitCode = error ? (error as any).code ?? 1 : 0;
        resolve({ output, exitCode });
      },
    );
  });
}

function uploadToCloudinary(filePath: string): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: 'video',
        folder: 'yooz/tutorials',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result as { secure_url: string; public_id: string });
      },
    );
  });
}

export default router;
