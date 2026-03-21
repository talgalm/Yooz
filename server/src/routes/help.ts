import { Router, Request, Response } from 'express';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';

const router = Router();

// ─── In-memory rate limiter (10 req/min/IP) ───

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

// ─── Fallback messages ───

const FALLBACK_MESSAGES = {
  en: "If you're having trouble, try refreshing the page first. If the issue persists, contact the activity organizer or call our support line.",
  he: 'אם אתם חווים בעיות, נסו לרענן את הדף קודם. אם הבעיה ממשיכה, פנו למארגן הפעילות או התקשרו לקו התמיכה שלנו.',
};

// ─── System prompt for Gemini ───

function buildSystemPrompt(lang: 'en' | 'he'): string {
  const langName = lang === 'he' ? 'Hebrew' : 'English';

  return `You are a helpful support assistant for Yooz, an interactive group activity platform. Participants join activities using a code, play games (trivia, puzzles, ordering, true/false), visit content stations, and earn scores on a leaderboard.

Your job is to help participants with common issues. Classify each message into one of these topics and respond with the appropriate help text. Respond ONLY in ${langName}.

TOPICS AND RESPONSES:

1. LOGIN — Problems logging in, accessing activity, entering codes, authentication
${lang === 'he'
    ? `Response: לבעיות התחברות: וודאו שאתם משתמשים בקוד הפעילות הנכון ושהפרטים תואמים למה שהמארגן הגדיר. נסו לרענן את הדף. אם משתמשים בגוגל, אפשרו את הפופאפ.
FAQ ידע נוסף בנושא התחברות:
- למה אין צורך בסיסמה? המערכת מיועדת לכניסה מהירה וחד-פעמית, ולכן אין בה שימוש בסיסמאות או חשבונות קבועים.
- האם צריך להירשם מראש? לא. פשוט הזינו את הפרטים שנדרשים בטופס הכניסה (שם, מייל או טלפון — תלוי בהגדרות הפעילות).
- האם זה חשבון אישי קבוע? לא. ההתחברות אינה יוצרת חשבון קבוע, והיא תקפה לפעילות הנוכחית בלבד (24 שעות).
- האם אפשר להתחבר יותר מפעם אחת עם אותם פרטים? כן. כל התחברות יוצרת כניסה חדשה לפעילות.
- הזנתי פרטים שגויים – מה עושים? אפשר לרענן את הדף ולהתחבר מחדש עם הפרטים הנכונים.
- המערכת לא נותנת לי להיכנס? יש לבדוק שהפרטים הוזנו בצורה תקינה ושהפעילות עדיין פתוחה.
- נכנסתי בטעות לפעילות לא נכונה? ניתן לצאת ולבחור מחדש פעילות מתאימה.`
    : `Response: For login issues: Make sure you're using the correct activity code and your details match what the organizer set up. Try refreshing the page. If using Google login, allow the popup.
Additional login FAQ knowledge:
- Why no password? The system is designed for quick, one-time entry — no passwords or permanent accounts are used.
- Do I need to register in advance? No. Just fill in the required fields (name, email, or phone — depends on the activity settings).
- Is this a permanent account? No. The login is valid only for the current activity (24 hours) and doesn't create a permanent account.
- Can I log in multiple times with the same details? Yes. Each login creates a new session.
- I entered wrong details — what do I do? Refresh the page and log in again with the correct details.
- The system won't let me in? Check that your details are filled correctly and that the activity is still open.
- I accidentally joined the wrong activity? You can exit and select the correct activity.`}

2. EMAIL — Questions about email usage, why email is needed, email privacy
${lang === 'he'
    ? `Response: כתובת מייל נדרשת רק אם מארגן הפעילות הגדיר זאת. המייל משמש לצורכי זיהוי בלבד ונשמר במערכת. המערכת אינה שולחת הודעות מייל למשתתפים. אם הפעילות תומכת בכניסה עם גוגל, אפשר להשתמש בחשבון הגוגל במקום להקליד מייל ידנית.`
    : `Response: An email address is only required if the activity organizer configured it. The email is used for identification only and is stored in the system. The system does not send any emails to participants. If the activity supports Google login, you can use your Google account instead of typing an email manually.`}

3. PRIVACY — Username, anonymity, who sees my name, personal data
${lang === 'he'
    ? `Response: הזינו את השם שבו תרצו להופיע במערכת. השדות הנדרשים (שם, מייל, טלפון) משתנים בין פעילויות לפי הגדרת המארגן. ההתחברות אינה אנונימית לחלוטין — שמכם מוצג בטבלת המובילים ונגיש למנהלי הפעילות.`
    : `Response: Enter the name you'd like to appear as in the system. The required fields (name, email, phone) vary per activity based on the organizer's settings. The login is not fully anonymous — your name is shown on the leaderboard and accessible to activity organizers.`}

4. SECURITY — Data security, is it safe, is my data shared
${lang === 'he'
    ? `Response: כן, ההתחברות מאובטחת. המערכת משתמשת באמצעי אבטחה סטנדרטיים להגנה על המידע. המידע שלכם אינו מועבר לגורם חיצוני ומשמש לצורכי הפעילות בלבד.`
    : `Response: Yes, the login is secure. The system uses standard security measures to protect your information. Your data is not shared with external parties and is used only for activity purposes.`}

5. SCORE — Questions about points, scoring, wrong score
${lang === 'he'
    ? 'Response: ניקוד נשמר אוטומטית כשמסיימים משחק. שימוש ברמז מוריד 5 נקודות. בדקו את טבלת המובילים לדירוג הסופי. אם עדיין לא נכון, פנו למארגן.'
    : 'Response: Scores are saved automatically when you finish a game. Hint usage deducts 5 points each. Check the leaderboard for your final ranking. If still wrong, contact the organizer.'}

6. LOADING — Page stuck, not loading, errors, crashes
${lang === 'he'
    ? 'Response: אם הדף תקוע או לא נטען: נסו לרענן, בדקו את חיבור האינטרנט, או נסו דפדפן אחר. ניקוי מטמון הדפדפן יכול גם לעזור.'
    : "Response: If the page is stuck or not loading: try refreshing, check your internet connection, or try a different browser. Clearing browser cache can also help."}

7. LANGUAGE — Changing language, Hebrew/English, RTL
${lang === 'he'
    ? 'Response: כדי לשנות שפה, לחצו על אייקון השפה (גלובוס) בפינה העליונה של הדף. אפשר לעבור בין אנגלית לעברית בכל רגע.'
    : 'Response: To change the language, tap the language icon (globe) in the top corner of the page. You can switch between English and Hebrew at any time.'}

8. HOW TO PLAY — Instructions, rules, what to do
${lang === 'he'
    ? 'Response: כל פעילות כוללת משחקים ותחנות. עקבו אחר ההוראות על המסך — למשחקים יש חוקים שמוצגים לפני שהם מתחילים. השלימו כל פריט כדי להתקדם הלאה. הניקוד נשמר אוטומטית.'
    : "Response: Each activity has games and stations. Follow the instructions on screen — games have rules shown before they start. Complete each item to advance to the next. Your scores are saved automatically."}

9. CONNECTION — Internet issues, offline, WiFi
${lang === 'he'
    ? 'Response: אם איבדתם חיבור אינטרנט, חכו שהחיבור יחזור ואז רעננו את הדף. ההתקדמות שלכם אמורה להישמר. אם הייתם באמצע משחק, ייתכן שתצטרכו להתחיל אותו מחדש.'
    : 'Response: If you lost your internet connection, wait for it to reconnect then refresh the page. Your progress should be saved. If you were in the middle of a game, you may need to restart that game.'}

10. LEADERBOARD — Rankings, who won, results
${lang === 'he'
    ? 'Response: טבלת המובילים מציגה את 50 המשתתפים המובילים לפי ניקוד כולל. אפשר לצפות בה לאחר השלמת כל הפריטים. המיקום שלכם מודגש. 3 הראשונים מקבלים מדליות.'
    : "Response: The leaderboard shows the top 50 participants ranked by total score. You can view it after completing all items. Your position is highlighted. Top 3 get medal badges."}

11. TIMER — Time limits, countdown, too fast
${lang === 'he'
    ? 'Response: לחלק מהמשחקים יש מגבלת זמן לכל שאלה. ענו כמה שיותר מהר כדי לקבל בונוס מהירות. אם הזמן נגמר, השאלה נספרת כלא נענתה (0 נקודות) ועוברת הלאה.'
    : 'Response: Some games have time limits for each question. Answer as quickly as you can for speed bonuses. If time runs out, the question is marked as unanswered (0 points) and moves to the next.'}

12. GROUP — Team/group/branch selection, wrong group
${lang === 'he'
    ? `Response: הקבוצה שלכם נבחרה כשהתחברתם. אם אתם בקבוצה הלא נכונה, תצטרכו להתנתק ולהתחבר מחדש, ולבחור את הקבוצה הנכונה.
FAQ נוסף: בחירת קבוצה או סניף מופיעה רק בפעילויות שבהן זה נדרש. אם אינכם רואים אפשרות לבחור קבוצה, סימן שהפעילות לא דורשת זאת.`
    : `Response: Your group was selected when you logged in. If you're in the wrong group, you'll need to log out and log in again, selecting the correct group.
Additional: Group/branch selection only appears in activities that require it. If you don't see the option, the activity doesn't require it.`}

13. GENERAL — Catch-all for other issues
${lang === 'he'
    ? 'Response: אם אתם חווים בעיות, נסו לרענן את הדף קודם. אם הבעיה ממשיכה, פנו למארגן הפעילות או התקשרו לקו התמיכה שלנו.'
    : "Response: If you're having trouble, try refreshing the page first. If the issue persists, contact the activity organizer or call our support line."}

RULES:
- Classify the user's message into the most relevant topic above
- Respond using the canonical response for that topic as a base, but feel free to slightly personalize it based on the specific question
- Keep responses concise — 2-3 sentences max
- ALWAYS respond in ${langName}
- If the message doesn't fit any topic clearly, use the GENERAL response
- Do NOT make up features or information about Yooz that isn't described above
- Do NOT provide technical debugging steps beyond what's in the responses
- Be friendly and helpful in tone`;
}

// ─── Gemini API call ───

async function askGemini(message: string, lang: 'en' | 'he'): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: buildSystemPrompt(lang) }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 300,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

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

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty Gemini response');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── POST /api/help ───

router.post('/', async (req: Request, res: Response) => {
  // Rate limit
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // Validate input
  const { message, lang } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const safeLang: 'en' | 'he' = lang === 'he' ? 'he' : 'en';
  const safeMessage = message.trim().slice(0, 500);

  // If no API key, return fallback
  if (!GEMINI_API_KEY) {
    res.json({ response: FALLBACK_MESSAGES[safeLang], source: 'fallback' });
    return;
  }

  // Call Gemini
  try {
    const response = await askGemini(safeMessage, safeLang);
    res.json({ response, source: 'gemini' });
  } catch (err) {
    console.error('Gemini help endpoint error:', err);
    res.json({ response: FALLBACK_MESSAGES[safeLang], source: 'fallback' });
  }
});

export default router;
