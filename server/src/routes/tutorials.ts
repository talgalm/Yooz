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

function loadExampleSpecs(): string {
  const walkthroughsDir = path.join(PROJECT_ROOT, 'walkthroughs');
  try {
    const files = readdirSync(walkthroughsDir)
      .filter((f) => f.endsWith('.spec.ts') && !f.startsWith('dynamic-'))
      .sort();
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
The user will describe in Hebrew (or English) what walkthrough video they want.
You must output ONLY valid TypeScript code — a complete Playwright test file. No markdown fences, no explanation, just code.

Available imports from './helpers':
  - startNarration() — call once at the start
  - showCaption(page, text, durationMs?) — show a Hebrew caption overlay (default 3500ms). Also records timestamp for voice narration.
  - highlightAndClick(page, selector, caption?) — highlight element, show caption, then click. Includes auto-pause for voice.
  - highlightAndFill(page, selector, value, caption?) — highlight element, type slowly (char by char), show caption. Includes auto-pause.
  - pause(page, ms?) — wait (default 2000ms)
  - saveNarrationLog(path) — save narration JSON for voice post-processing. Call at the end.

IMPORTANT RULES:
1. Always start with: import { test } from '@playwright/test'; and import helpers.
2. Always call startNarration() first.
3. Always call saveNarrationLog('NARRATION_OUTPUT_PATH') at the end.
4. Login is almost always needed first — use the EXACT login flow from the UI map below.
5. Use .catch(() => {}) on navigation waits and optional clicks to prevent failures.
6. All captions MUST be in Hebrew.
7. Use pause(page, 1500) between major actions so the video is watchable.
8. For form fills, use highlightAndFill with descriptive Hebrew caption.
9. For button clicks, use highlightAndClick with descriptive Hebrew caption.
10. Keep the total video under 60 seconds — don't add too many steps.
11. Use ONLY selectors documented in the UI MAP below. Do NOT guess selectors.
12. For tab switching, always use both English and Hebrew selectors: button:has-text("English"), button:has-text("עברית")
13. For clicking elements that may not exist, always add .catch(() => {}).
14. After any navigation, use page.waitForURL() with .catch(() => {}) and then pause().
15. NEVER chain .first() or .last() on a string selector inside highlightAndClick/highlightAndFill — those helpers already call .first() internally.
16. For page.locator() calls, always use the pattern: await page.locator('selector').first().click().catch(() => {});

=== COMPLETE UI MAP (routes, selectors, Hebrew labels, navigation flows) ===

${uiMap}

=== END UI MAP ===

=== EXAMPLE SPECS (use these as reference for style, structure, and patterns) ===

${examples}

=== END EXAMPLES ===

Now generate the spec based on the user's request. Output ONLY the TypeScript code, nothing else.`;
}

// ─── Gemini LLM: free text → Playwright spec ───

async function askGemini(userText: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const systemPrompt = buildSystemPrompt();

  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\nUser request:\n' + userText }] },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

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

      if (res.status === 429 && attempt < maxRetries) {
        clearTimeout(timeout);
        const waitSec = Math.pow(2, attempt + 1) * 15; // 30s, 60s, 120s
        console.log(`[Gemini] Rate limited (429). Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
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

// ─── Fallback: keyword-based template when Gemini is unavailable ───

function generateFallbackSpec(title: string, description: string, narrationJsonPath: string): string {
  const text = (title + ' ' + description).toLowerCase();

  // Detect what the user wants based on keywords
  const wantsLogin = /login|התחברות|כניסה/.test(text);
  const wantsCreate = /create|יצירה|יצירת|ליצור|צור|פעילות חדשה/.test(text);
  const wantsLibrary = /library|ספרייה|ייבוא|ייצוא|שחזור/.test(text);
  const wantsStats = /statistic|סטטיסטיק|אנליטיק|נתונים|דוחות/.test(text);
  const wantsGames = /game|משחק|משחקים/.test(text);
  const wantsStations = /station|תחנה|תחנות/.test(text);
  const wantsUsers = /user|משתמש|משתמשים/.test(text);
  const wantsParticipant = /play|לשחק|משתתף|פעילות מסוימת|נכנסים לפעילות|להיכנס לפעילות/.test(text);

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
  if (!wantsCreate && !wantsLibrary && !wantsStats && !wantsGames && !wantsStations && !wantsUsers && !wantsLogin) {
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

  try {
    // Step 0: Generate the Playwright spec
    await setStep(tutorialId, 0, 'running');
    let specContent: string;

    console.log(`[Tutorial ${safeId}] Asking Gemini to generate spec for: "${description.slice(0, 80)}..."`);
    const rawSpec = await askGemini(`${title}\n${description}`);
    specContent = extractCode(rawSpec);
    specContent = specContent.replace(/NARRATION_OUTPUT_PATH/g, narrationJson.replace(/\\/g, '/'));

    if (!specContent.includes('import') || !specContent.includes('test(')) {
      throw new Error('Gemini returned invalid spec — missing import or test()');
    }
    console.log(`[Tutorial ${safeId}] Gemini spec generated (${specContent.length} chars)`);

    // Syntax-check: write temp file and run Playwright --list to detect compile errors.
    // If it fails, send the errors back to Gemini for one correction attempt.
    writeFileSync(specFile, specContent);
    const listCmd = `cd "${PROJECT_ROOT}" && npx playwright test --list --project=walkthroughs "${specFile}" 2>&1`;
    const { output: listOutput, exitCode: listExit } = await runCommand(listCmd, 30_000);
    if (listExit !== 0) {
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
        console.log(`[Tutorial ${safeId}] Corrected spec still has errors:\n${retryOutput.slice(-600)}`);
        try { unlinkSync(specFile); } catch {}
        throw new Error('Gemini spec has syntax errors — generation aborted');
      }
      console.log(`[Tutorial ${safeId}] Correction pass succeeded`);
    }

    writeFileSync(specFile, specContent);
    console.log(`[Tutorial ${safeId}] Generated spec:\n${specContent}`);
    await setStep(tutorialId, 0, 'done', 'Gemini AI');

    // Step 1: Run Playwright
    await setStep(tutorialId, 1, 'running');
    console.log(`[Tutorial ${safeId}] Running Playwright...`);
    if (!existsSync(videoDir)) mkdirSync(videoDir, { recursive: true });

    const playwrightCmd = `cd "${PROJECT_ROOT}" && PLAYWRIGHT_BASE_URL="${baseUrl}" npx playwright test --reporter=list --project=walkthroughs "${specFile}" 2>&1`;
    const { output: playwrightOutput, exitCode } = await runCommand(playwrightCmd, 600_000);
    console.log(`[Tutorial ${safeId}] Playwright output (exit ${exitCode}):\n${playwrightOutput.slice(-1500)}`);

    // Check for video even if Playwright exited non-zero (partial test may still record)
    const videoFile = findVideoFile(videoDir, `dynamic-${safeId}`);
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
      const voiceCmd = `cd "${PROJECT_ROOT}" && npx tsx walkthroughs/add-voice.ts "${videoFile}" "${narrationJson}" "${outputPath}" 2>&1`;
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
    cleanupLocalFiles(safeId, specFile, narrationJson, videoDir);
  }
}

/**
 * Remove all local files generated for a tutorial (spec, narration, video folder).
 */
function cleanupLocalFiles(safeId: string, specFile: string, narrationJson: string, videoDir: string) {
  try { unlinkSync(specFile); } catch {}
  try { unlinkSync(narrationJson); } catch {}
  // Remove narrated mp4
  try { unlinkSync(path.join(videoDir, `tutorial-${safeId}-narrated.mp4`)); } catch {}
  // Remove Playwright video subfolder(s) matching this tutorial
  try {
    const entries = readdirSync(videoDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes(`dynamic-${safeId}`)) {
        rmSync(path.join(videoDir, entry.name), { recursive: true, force: true });
      }
    }
  } catch {}
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

function runCommand(cmd: string, timeoutMs: number): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '');
      const exitCode = error ? (error as any).code ?? 1 : 0;
      resolve({ output, exitCode });
    });
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
