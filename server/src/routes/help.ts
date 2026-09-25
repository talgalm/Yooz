import { Router, Request, Response } from 'express';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { Activity } from '../models';
import { type OrganizerContact, contactClause, askClause, buildFallbackMessage } from './help.i18n';
import { languageOf } from '../utils/languages';
import { normaliseLang } from '../utils/requestLang';
import { translateText } from '../services/contentTranslation';
import { createRateLimiter } from '../utils/participantRateLimit';

const router = Router();

const isRateLimited = createRateLimiter({
  perParticipant: 10,
  perAnonymous: 10,
  perAddress: 150,
});

async function fetchActivityExtras(code?: string): Promise<{ extraSupportInfo?: string; contact?: OrganizerContact }> {
  if (!code) return {};
  const activity = await Activity.findOne({ code }).select('extraSupportInfo organizerContactName organizerContactPhone').lean();
  if (!activity) return {};
  const contact = activity.organizerContactName && activity.organizerContactPhone
    ? { name: activity.organizerContactName, phone: activity.organizerContactPhone }
    : undefined;
  return { extraSupportInfo: activity.extraSupportInfo || undefined, contact };
}

function buildSystemPrompt(examples: 'en' | 'he', replyLang: string, contact?: OrganizerContact): string {
  const langName = languageOf(replyLang).name;

  return `You are a helpful support assistant for Yooz, an interactive group activity platform. Participants join activities using a unique code, then see a roadmap of stations/items they must tap to open and play. Station types include: games (trivia, puzzles, ordering, true/false, ball-catch game, jigsaw, trash-sort), text/video/image content stations, and badge stations. Participants earn scores and appear on a leaderboard.

HOW THE PLATFORM WORKS:
- Participant flow: enter activity code → log in (name/email/phone/Google) → see roadmap → TAP a station card to open it → play/read → return to roadmap → finish all stations → view leaderboard
- A game ONLY starts when the participant taps its station card in the roadmap. There is no automatic start.
- The admin/manager portal (/admin or /manager) is a SEPARATE login from the participant activity login. Admins use an admin password; participants use a code + name/email.
- The portal (/portal/:code) is a separate public display screen for managers showing activity results — not a participant login page.

Your job is to help participants with common issues. Classify each message into one of these topics and respond with the appropriate help text. Respond ONLY in ${langName}.

TOPICS AND RESPONSES:

1. LOGIN — Problems logging in, accessing activity, authentication
${examples === 'he'
    ? `Response: לבעיות התחברות: אין צורך בסיסמה או קוד — פשוט הזינו את הפרטים הנדרשים (שם, ואם נדרש — מייל או טלפון). וודאו שהפרטים מאוייתים נכון. נסו לרענן את הדף. אם משתמשים בגוגל, אפשרו את הפופאפ.
FAQ ידע נוסף בנושא התחברות:
- האם יש קוד כניסה? לא — הכניסה לפעילות נעשית דרך קישור ישיר. אין להזין קוד בטופס הכניסה.
- למה אין צורך בסיסמה? המערכת מיועדת לכניסה מהירה וחד-פעמית, ולכן אין בה שימוש בסיסמאות או חשבונות קבועים.
- האם צריך להירשם מראש? לא. פשוט הזינו את הפרטים שנדרשים בטופס הכניסה (שם, מייל או טלפון — תלוי בהגדרות הפעילות).
- האם זה חשבון אישי קבוע? לא. ההתחברות אינה יוצרת חשבון קבוע, והיא תקפה לפעילות הנוכחית בלבד (24 שעות).
- האם אפשר להתחבר יותר מפעם אחת עם אותם פרטים? כן. כל התחברות יוצרת כניסה חדשה לפעילות.
- הזנתי פרטים שגויים – מה עושים? אפשר לרענן את הדף ולהתחבר מחדש עם הפרטים הנכונים.
- המערכת לא נותנת לי להיכנס? יש לבדוק שהפרטים הוזנו בצורה תקינה ושהפעילות עדיין פתוחה.`
    : `Response: For login issues: No password or code is needed — just fill in your name and any other required fields (email or phone, depending on the activity). Make sure the details are spelled correctly. Try refreshing the page. If using Google login, allow the popup.
Additional login FAQ knowledge:
- Is there an activity code to type? No — you access the activity via a direct link. There is no code to enter in the login form.
- Why no password? The system is designed for quick, one-time entry — no passwords or permanent accounts are used.
- Do I need to register in advance? No. Just fill in the required fields (name, email, or phone — depends on the activity settings).
- Is this a permanent account? No. The login is valid only for the current activity (24 hours) and doesn't create a permanent account.
- Can I log in multiple times with the same details? Yes. Each login creates a new session.
- I entered wrong details — what do I do? Refresh the page and log in again with the correct details.
- The system won't let me in? Check that your details are filled correctly and that the activity is still open.`}

2. EMAIL — Questions about email usage, why email is needed, email privacy
${examples === 'he'
    ? `Response: כתובת מייל נדרשת רק אם מארגן הפעילות הגדיר זאת. המייל משמש לצורכי זיהוי בלבד ונשמר במערכת. המערכת אינה שולחת הודעות מייל למשתתפים. אם הפעילות תומכת בכניסה עם גוגל, אפשר להשתמש בחשבון הגוגל במקום להקליד מייל ידנית.`
    : `Response: An email address is only required if the activity organizer configured it. The email is used for identification only and is stored in the system. The system does not send any emails to participants. If the activity supports Google login, you can use your Google account instead of typing an email manually.`}

3. PRIVACY — Username, anonymity, who sees my name, personal data
${examples === 'he'
    ? `Response: הזינו את השם שבו תרצו להופיע במערכת. השדות הנדרשים (שם, מייל, טלפון) משתנים בין פעילויות לפי הגדרת המארגן. ההתחברות אינה אנונימית לחלוטין — שמכם מוצג בטבלת המובילים ונגיש למנהלי הפעילות.`
    : `Response: Enter the name you'd like to appear as in the system. The required fields (name, email, phone) vary per activity based on the organizer's settings. The login is not fully anonymous — your name is shown on the leaderboard and accessible to activity organizers.`}

4. SECURITY — Data security, is it safe, is my data shared
${examples === 'he'
    ? `Response: כן, ההתחברות מאובטחת. המערכת משתמשת באמצעי אבטחה סטנדרטיים להגנה על המידע. המידע שלכם אינו מועבר לגורם חיצוני ומשמש לצורכי הפעילות בלבד.`
    : `Response: Yes, the login is secure. The system uses standard security measures to protect your information. Your data is not shared with external parties and is used only for activity purposes.`}

5. SCORE — Questions about points, scoring, wrong score
${examples === 'he'
    ? `Response: ניקוד נשמר אוטומטית כשמסיימים משחק. שימוש ברמז מוריד 5 נקודות. בדקו את טבלת המובילים לדירוג הסופי. אם עדיין לא נכון, ${contactClause(examples, contact)}.`
    : `Response: Scores are saved automatically when you finish a game. Hint usage deducts 5 points each. Check the leaderboard for your final ranking. If still wrong, ${contactClause(examples, contact)}.`}

6. LOADING — Page stuck, not loading, errors, crashes
${examples === 'he'
    ? 'Response: אם הדף תקוע או לא נטען: נסו לרענן, בדקו את חיבור האינטרנט, או נסו דפדפן אחר. ניקוי מטמון הדפדפן יכול גם לעזור.'
    : "Response: If the page is stuck or not loading: try refreshing, check your internet connection, or try a different browser. Clearing browser cache can also help."}

7. LANGUAGE — Changing language, Hebrew/English, RTL
${examples === 'he'
    ? 'Response: כדי לשנות שפה, לחצו על אייקון השפה (גלובוס) בפינה העליונה של הדף. אפשר לעבור בין אנגלית לעברית בכל רגע.'
    : 'Response: To change the language, tap the language icon (globe) in the top corner of the page. You can switch between English and Hebrew at any time.'}

8. HOW TO PLAY — Instructions, rules, what to do
${examples === 'he'
    ? 'Response: כל פעילות כוללת משחקים ותחנות. עקבו אחר ההוראות על המסך — למשחקים יש חוקים שמוצגים לפני שהם מתחילים. השלימו כל פריט כדי להתקדם הלאה. הניקוד נשמר אוטומטית.'
    : "Response: Each activity has games and stations. Follow the instructions on screen — games have rules shown before they start. Complete each item to advance to the next. Your scores are saved automatically."}

9. CONNECTION — Internet issues, offline, WiFi
${examples === 'he'
    ? 'Response: אם איבדתם חיבור אינטרנט, חכו שהחיבור יחזור ואז רעננו את הדף. ההתקדמות שלכם אמורה להישמר. אם הייתם באמצע משחק, ייתכן שתצטרכו להתחיל אותו מחדש.'
    : 'Response: If you lost your internet connection, wait for it to reconnect then refresh the page. Your progress should be saved. If you were in the middle of a game, you may need to restart that game.'}

10. LEADERBOARD — Rankings, who won, results
${examples === 'he'
    ? 'Response: טבלת המובילים מציגה את 50 המשתתפים המובילים לפי ניקוד כולל. אפשר לצפות בה לאחר השלמת כל הפריטים. המיקום שלכם מודגש. 3 הראשונים מקבלים מדליות.'
    : "Response: The leaderboard shows the top 50 participants ranked by total score. You can view it after completing all items. Your position is highlighted. Top 3 get medal badges."}

11. TIMER — Time limits, countdown, too fast
${examples === 'he'
    ? 'Response: לחלק מהמשחקים יש מגבלת זמן לכל שאלה. ענו כמה שיותר מהר כדי לקבל בונוס מהירות. אם הזמן נגמר, השאלה נספרת כלא נענתה (0 נקודות) ועוברת הלאה.'
    : 'Response: Some games have time limits for each question. Answer as quickly as you can for speed bonuses. If time runs out, the question is marked as unanswered (0 points) and moves to the next.'}

12. GROUP — Team/group/branch selection, wrong group
${examples === 'he'
    ? `Response: הקבוצה שלכם נבחרה כשהתחברתם. אם אתם בקבוצה הלא נכונה, תצטרכו להתנתק ולהתחבר מחדש, ולבחור את הקבוצה הנכונה.
FAQ נוסף: בחירת קבוצה או סניף מופיעה רק בפעילויות שבהן זה נדרש. אם אינכם רואים אפשרות לבחור קבוצה, סימן שהפעילות לא דורשת זאת.`
    : `Response: Your group was selected when you logged in. If you're in the wrong group, you'll need to log out and log in again, selecting the correct group.
Additional: Group/branch selection only appears in activities that require it. If you don't see the option, the activity doesn't require it.`}

13. GENERAL — Catch-all for other issues
${examples === 'he'
    ? `Response: אם אתם חווים בעיות, נסו לרענן את הדף קודם. אם הבעיה ממשיכה, ${contactClause(examples, contact)} או התקשרו לקו התמיכה שלנו.`
    : `Response: If you're having trouble, try refreshing the page first. If the issue persists, ${contactClause(examples, contact)} or call our support line.`}

14. GAME_START — Game not starting, don't know what to press, nothing happens, activity not beginning, how to start
${examples === 'he'
    ? `Response: תלוי איפה אתם:
• אם עדיין בדף הכניסה: מלאו את השם שלכם (ואם מופיעים שדות נוספים — אימייל או טלפון), ולחצו על הכפתור כדי להיכנס לפעילות.
• אם כבר בפנים: לחצו על כרטיסיית תחנה במפת הדרכים — כל לחיצה פותחת ומתחילה פעילות.
אם לא קרה כלום — נסו לרענן את הדף.`
    : `Response: It depends where you are:
• If you're still on the login page: fill in your name (and email or phone if those fields appear), then press the button to enter.
• If you're already inside the activity: tap a station card in the roadmap — each tap opens and starts that game.
If nothing happens, try refreshing the page.`}

15. KICKED_OUT — Thrown out of the activity, session lost, has to start over, lost the link
${examples === 'he'
    ? `Response: היכנסו שוב מהקישור שנשלח אליכם. אם אין לכם יותר את הקישור — ${askClause(examples, contact)} קישור חדש לפעילות. בכניסה מחדש בחרו את שם הקבוצה מהרשימה, והזינו בדיוק את אותו השם שהזנתם קודם — כך ההתקדמות שלכם נמצאת שוב.`
    : `Response: Open the activity again from the link you were sent. If you don't have the link any more, ${askClause(examples, contact)} for a new one. When you log back in, pick your group from the list and type exactly the same name you used before — that's how your progress is found again.`}

16. BUTTON_STUCK — A button does nothing when pressed
${examples === 'he'
    ? 'Response: רעננו את הדף ונסו שוב. אם עדיין לא קורה כלום, זו בדרך כלל קליטה חלשה — עברו למקום עם קליטה טובה יותר ונסו פעם נוספת.'
    : 'Response: Refresh the page and try again. If it still does nothing, it is usually weak reception — move somewhere with a better signal and try once more.'}

17. TASK_STUCK — Cannot complete/solve a task, too hard, needs the answer
${examples === 'he'
    ? `Response: נסו קודם את הרמז שבתוך המשחק (הוא עולה 5 נקודות). אם אין רמז, או שהוא לא מספיק — ${contactClause(examples, contact)}, שיכול לחשוף לכם את הפתרון מדף התשובות.`
    : `Response: Try the hint inside the game first (it costs 5 points). If there's no hint, or it isn't enough, ${askClause(examples, contact)} — they can reveal the solution from the answer sheet.`}

18. VIDEO_MISSING — The collage video never appeared
${examples === 'he'
    ? 'Response: אם המסך עדיין טוען — בחרו לקבל את הסרטון ב-SMS והוא יגיע אליכם בהודעה. אם כבר בחרתם SMS, או שאינכם מעוניינים — פשוט המתינו, הסרטון עדיין בהכנה. אם קפץ ישר מסך הסיום, כנראה שלא צולמו כל התמונות ולא ניתן ליצור סרטון הפעם.'
    : "Response: If the screen is still loading, choose to receive it by SMS and the video will arrive as a message. If you already chose SMS, or you don't want it, just wait — the video is still being built. If the finish screen appeared straight away, some of the photos were probably never taken, and no video can be made this time."}

RULES:
- Classify the user's message into the most relevant topic above (topics 1-18)
- If the user asks how to start a game / what to press / nothing is happening → use GAME_START (topic 14)
- Topics 15-18 are the field troubleshooting sheet. Prefer them over the generic
  LOADING/CONNECTION answers when the participant describes one of those situations:
  being thrown out of the activity (15), a dead button (16), a task they cannot finish (17),
  or a missing collage video (18). Give the steps in the order listed — they are ordered by
  what to try first.
- If the user mentions portal/admin/manager login → clarify those are separate from participant login
- Respond using the canonical response for that topic as a base, but feel free to slightly personalize it based on the specific question
- Keep responses concise — 2-3 sentences max
- ALWAYS respond in ${langName}
- If the message doesn't fit any topic clearly, use the GENERAL response
- Do NOT make up features or information about Yooz that isn't described above
- Do NOT provide technical debugging steps beyond what's in the responses
- Be friendly and helpful in tone
- IMPORTANT: If the conversation history already contains an answer to this topic, do NOT repeat the same content. Instead, acknowledge what was already suggested and offer a different next step (e.g., contact the organizer, try a different browser, refresh again).`;
}

interface HelpContext {
  activityName?: string;
  phase?: string;
  itemIndex?: number;
  totalItems?: number;
  itemName?: string;
  itemType?: string;
  code?: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined);

function sanitizeContext(raw: unknown): HelpContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ctx: HelpContext = {
    activityName: str(r.activityName, 100),
    phase: str(r.phase, 30),
    itemIndex: num(r.itemIndex),
    totalItems: num(r.totalItems),
    itemName: str(r.itemName, 100),
    itemType: str(r.itemType, 30),
    code: str(r.code, 10),
  };
  return Object.values(ctx).some((v) => v !== undefined) ? ctx : null;
}

function buildActivitySupportPrompt(text: string): string {
  return `\n\nADDITIONAL ACTIVITY-SPECIFIC SUPPORT INFO (provided by the organizer for this specific activity — applies ONLY here, do not apply it to any other activity or assume it's general platform behavior):\n${text}`;
}

function buildContextPrompt(ctx: HelpContext): string {
  const lines: string[] = ['\nLIVE PARTICIPANT CONTEXT (where the user is right now — use it to give specific, relevant help):'];
  if (ctx.activityName) lines.push(`- Activity: "${ctx.activityName}"`);
  if (ctx.phase) lines.push(`- Current screen: ${ctx.phase} (roadmap = station map, playing = inside a station/game, leaderboard/finish = end screens)`);
  if (ctx.itemIndex !== undefined && ctx.totalItems) lines.push(`- Current station: ${ctx.itemIndex + 1} of ${ctx.totalItems}`);
  if (ctx.itemName) lines.push(`- Station name: "${ctx.itemName}"`);
  if (ctx.itemType) lines.push(`- Station type: ${ctx.itemType}`);
  lines.push('When the user asks for help, prefer answering about THIS station/screen (how it works, what to do, common issues) before generic troubleshooting. Never reveal answers to game questions — guide, don\'t solve.');
  return lines.join('\n');
}

interface HistoryEntry {
  from: 'bot' | 'user';
  text: string;
}

async function askGemini(message: string, examples: 'en' | 'he', replyLang: string, history: HistoryEntry[] = [], context: HelpContext | null = null, contact?: OrganizerContact, extraSupportInfo?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const priorTurns = history.slice(-6).map((h) => ({
    role: h.from === 'bot' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }));

  const contents = [
    ...priorTurns,
    { role: 'user', parts: [{ text: message }] },
  ];

  const body = {
    contents,
    systemInstruction: { parts: [{ text: buildSystemPrompt(examples, replyLang, contact) + (extraSupportInfo ? buildActivitySupportPrompt(extraSupportInfo) : '') + (context ? buildContextPrompt(context) : '') }] },
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

router.post('/', async (req: Request, res: Response) => {
  if (isRateLimited(req)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  const { message, lang, history, context } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const safeLang = normaliseLang(lang);
  const examples: 'en' | 'he' = safeLang === 'he' ? 'he' : 'en';
  const safeMessage = message.trim().slice(0, 500);
  const safeHistory: HistoryEntry[] = Array.isArray(history)
    ? history.filter((h) => h && typeof h.text === 'string' && (h.from === 'bot' || h.from === 'user')).slice(0, 20)
    : [];
  const safeContext = sanitizeContext(context);
  const { extraSupportInfo, contact } = await fetchActivityExtras(safeContext?.code);

  if (!GEMINI_API_KEY) {
    res.json({ response: await translateText(buildFallbackMessage(examples, contact), safeLang), source: 'fallback' });
    return;
  }

  try {
    const response = await askGemini(safeMessage, examples, safeLang, safeHistory, safeContext, contact, extraSupportInfo);
    res.json({ response, source: 'gemini' });
  } catch (err) {
    console.error('Gemini help endpoint error:', err);
    res.json({ response: await translateText(buildFallbackMessage(examples, contact), safeLang), source: 'fallback' });
  }
});

export default router;
