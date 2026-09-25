import { Router, Request, Response } from 'express';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { normalizeText, coverage, jaccardSimilarity } from '../utils/hebrewText';
import { createRateLimiter } from '../utils/participantRateLimit';

const router = Router();

// ─── In-memory rate limiter (20 req/min/IP) ───

const isRateLimited = createRateLimiter({
  perParticipant: 20,
  perAnonymous: 20,
  perAddress: 200,
});

const FALLBACK_RESPONSE = 'אני עוד לא יודע לענות על זה...';

interface AvatarVideo {
  url: string;
  matchingWords: string[];
}

interface AvatarNamedEntry {
  name: string;
  description: string;
}

interface AvatarKnowledgeGate {
  trigger: string;
  reveal: string;
}

interface AvatarSettings {
  characterName?: string;
  detectiveRiddle?: string;
  instructions?: string;
  optionalAnswers?: string[];
  forbiddenPhrases?: string[];
  videos?: AvatarVideo[];
  characters?: AvatarNamedEntry[];
  clues?: AvatarNamedEntry[];
  knowledgeGates?: AvatarKnowledgeGate[];
  hintStrategy?: string;
}

interface HistoryEntry {
  role: 'user' | 'character';
  text: string;
}

function buildSystemPrompt(settings: AvatarSettings): string {
  const lines: string[] = [];
  const name = settings.characterName?.trim();

  // 1. Role — the witness being interrogated
  lines.push('1. התפקיד שלך:');
  if (name) {
    lines.push(`את/ה ${name}, עד בחקירה בלשית אינטראקטיבית. המשתמש הוא הבלש החוקר אותך.`);
  } else {
    lines.push('את/ה עד בחקירה בלשית אינטראקטיבית. המשתמש הוא הבלש החוקר אותך.');
  }
  lines.push('ענה/י תמיד בעברית, בגוף ראשון, בטון קצר וטבעי (1–2 משפטים).');
  lines.push('אל תצא/י מהדמות. אל תחשוף/י שאת/ה בינה מלאכותית.');

  // 2. Absolute truth
  if (settings.detectiveRiddle?.trim()) {
    lines.push('');
    lines.push('2. האמת מאחורי התעלומה (ידע רק שלך, אל תחשוף/י אותו ישירות):');
    lines.push(settings.detectiveRiddle.trim());
  }

  // 3. Characters & Clues
  const characters = (settings.characters || []).filter((c) => c.name?.trim() || c.description?.trim());
  const clues = (settings.clues || []).filter((c) => c.name?.trim() || c.description?.trim());
  if (characters.length > 0 || clues.length > 0) {
    lines.push('');
    lines.push('3. דמויות וראיות:');
    characters.forEach((c) => {
      const n = c.name?.trim() || '—';
      const d = c.description?.trim() || '';
      lines.push(`- ${n}${d ? `: ${d}` : ''}`);
    });
    clues.forEach((c) => {
      const n = c.name?.trim() || '—';
      const d = c.description?.trim() || '';
      lines.push(`- ${n}${d ? `: ${d}` : ''}`);
    });
  }

  // 4. Strict boundaries
  const forbidden = (settings.forbiddenPhrases || []).map((p) => p.trim()).filter(Boolean);
  lines.push('');
  lines.push('4. חוקים שחובה לשמור עליהם:');
  lines.push('- בשום פנים ואופן אל תגלה לשחקן את הפתרון הסופי. הוא חייב להגיע אליו בעצמו.');
  lines.push('- אל תמציא/י רמזים, דמויות או ראיות שלא מופיעים למעלה.');
  lines.push('- ענה/י רק על מה שהשחקן שואל. אל תענה/י על שאלות מחוץ לעולם הסיפור.');
  if (forbidden.length > 0) {
    lines.push('- הפרטים הבאים אסורים לגמרי (גם לא ברמיזה):');
    forbidden.forEach((p) => lines.push(`  • ${p}`));
  }

  // 5. Knowledge gates / path to solution / hint strategy
  const gates = (settings.knowledgeGates || []).filter((g) => g.trigger?.trim() && g.reveal?.trim());
  const optional = (settings.optionalAnswers || []).map((a) => a.trim()).filter(Boolean);
  const hasGateSection = gates.length > 0 || optional.length > 0 || settings.hintStrategy?.trim() || settings.instructions?.trim();
  if (hasGateSection) {
    lines.push('');
    lines.push('5. ניהול החקירה ומתן רמזים:');
    gates.forEach((g) => {
      lines.push(`- אם השחקן שואל על "${g.trigger.trim()}" → חשוף: ${g.reveal.trim()}`);
    });
    if (optional.length > 0) {
      lines.push('- תשובות מאושרות (אם השאלה של השחקן מתאימה לאחת מהן, השב/י אותה במילים שלה בדיוק, ללא תוספות, פתיחים או הסברים):');
      optional.forEach((a) => lines.push(`  • ${a}`));
    }
    if (settings.hintStrategy?.trim()) {
      lines.push(`- כשהשחקן נתקע: ${settings.hintStrategy.trim()}`);
    } else {
      lines.push('- כשהשחקן נתקע: אל תיתן/י תשובה. במקום זאת, שאל/י שאלת הכוונה שתעזור לו לחשוב בכיוון הנכון.');
    }
    if (settings.instructions?.trim()) {
      lines.push(`- הוראות נוספות: ${settings.instructions.trim()}`);
    }
  }

  // Videos (separate section — matching words)
  const videos = (settings.videos || []).filter((v) => v.url?.trim());
  if (videos.length > 0) {
    lines.push('');
    lines.push('סרטונים זמינים (המשתמש יכול לצפות בהם אם ישאל על המילים המתאימות — אל תכתוב URL):');
    videos.forEach((v, i) => {
      const words = (v.matchingWords || []).map((w) => w.trim()).filter(Boolean).join(', ');
      lines.push(`- סרטון ${i + 1} (מילים: ${words || 'ללא'})`);
    });
  }

  lines.push('');
  lines.push('כללי פלט: תשובה קצרה (עד 2 משפטים), ללא אימוג׳ים, ללא מרקדאון, ללא הסברים מטה-טקסט.');

  return lines.join('\n');
}

async function askGemini(
  message: string,
  settings: AvatarSettings,
  history: HistoryEntry[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const priorTurns = history.slice(-8).map((h) => ({
    role: h.role === 'character' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }));

  const contents = [...priorTurns, { role: 'user', parts: [{ text: message }] }];

  const body = {
    contents,
    systemInstruction: { parts: [{ text: buildSystemPrompt(settings) }] },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 200,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

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

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

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

// ─── Snap-to-config: if Gemini's response is "very close" to one of the
// configured optional answers, return the configured answer verbatim. This
// keeps the chat text + TTS reading aligned with what the admin authored.

function snapToOptionalAnswer(response: string, optionalAnswers: string[] | undefined): string {
  const candidates = (optionalAnswers || []).map((a) => a.trim()).filter(Boolean);
  if (candidates.length === 0) return response;

  const normResp = normalizeText(response);

  // 1. Substring match — Gemini said the answer almost verbatim with extras.
  //    Require the answer to have meaningful length so trivial words don't snap.
  for (const ans of candidates) {
    const normAns = normalizeText(ans);
    if (normAns.length >= 8 && normResp.includes(normAns)) return ans;
  }

  // 2. Coverage + Jaccard — Gemini paraphrased but reused most of the answer's
  //    words. Coverage ≥ 0.8 means almost every word of the answer appears in
  //    the response; Jaccard ≥ 0.55 prevents matching when the response is
  //    dramatically longer/different.
  let best: { ans: string; cov: number; jac: number } | null = null;
  for (const ans of candidates) {
    const cov = coverage(ans, response);
    const jac = jaccardSimilarity(ans, response);
    if (!best || cov > best.cov || (cov === best.cov && jac > best.jac)) {
      best = { ans, cov, jac };
    }
  }

  if (best && best.cov >= 0.8 && best.jac >= 0.55) return best.ans;

  return response;
}

function matchVideo(message: string, videos: AvatarVideo[]): string | undefined {
  const text = message.toLowerCase();
  for (const v of videos) {
    if (!v.url?.trim()) continue;
    const words = (v.matchingWords || []).map((w) => w.trim().toLowerCase()).filter(Boolean);
    if (words.some((w) => text.includes(w))) {
      return v.url.trim();
    }
  }
  return undefined;
}

router.post('/', async (req: Request, res: Response) => {
  if (isRateLimited(req)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  const { message, history, settings } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const safeMessage = message.trim().slice(0, 500);
  const safeSettings: AvatarSettings =
    settings && typeof settings === 'object' ? (settings as AvatarSettings) : {};
  const safeHistory: HistoryEntry[] = Array.isArray(history)
    ? history
        .filter(
          (h: unknown) =>
            h &&
            typeof h === 'object' &&
            typeof (h as HistoryEntry).text === 'string' &&
            ((h as HistoryEntry).role === 'user' || (h as HistoryEntry).role === 'character')
        )
        .slice(-20)
    : [];

  const videoUrl = matchVideo(safeMessage, safeSettings.videos || []);

  if (!GEMINI_API_KEY) {
    res.json({ response: FALLBACK_RESPONSE, videoUrl, source: 'fallback' });
    return;
  }

  try {
    const raw = await askGemini(safeMessage, safeSettings, safeHistory);
    const response = snapToOptionalAnswer(raw, safeSettings.optionalAnswers);
    res.json({ response, videoUrl, source: 'gemini' });
  } catch (err) {
    console.error('Avatar chat endpoint error:', err);
    res.json({ response: FALLBACK_RESPONSE, videoUrl, source: 'fallback' });
  }
});

export default router;
