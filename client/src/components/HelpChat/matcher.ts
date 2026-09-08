/**
 * Smart keyword matcher for help chat automatic responses.
 *
 * Architecture: This is a pluggable module. To upgrade to LLM-based responses,
 * replace this file's `matchTopic` function with an API call to your LLM endpoint.
 * The interface stays the same: (input: string, lang: Lang) => MatchResult | null
 */

import type { Lang } from '../../context/LanguageContext';

export interface MatchResult {
  topicId: string;
  confidence: number; // 0-1
  responseKey: string; // key into i18n responses
}

interface TopicDef {
  id: string;
  responseKey: string;
  keywords: {
    en: string[];
    he: string[];
  };
}

// ─── Help Topics ───

const topics: TopicDef[] = [
  {
    id: 'login',
    responseKey: 'responseLogin',
    keywords: {
      en: ['login', 'log in', 'sign in', 'cant login', 'cannot login', 'password', 'access', 'enter', 'join', 'connect', 'register', 'registration', 'account', 'wrong activity', 'wrong code', 'wont let me in'],
      he: ['התחברות', 'להתחבר', 'כניסה', 'להיכנס', 'סיסמה', 'גישה', 'לא מצליח להיכנס', 'לא נכנס', 'הרשמה', 'להירשם', 'חשבון', 'פעילות לא נכונה', 'קוד שגוי', 'זיהוי'],
    },
  },
  {
    id: 'email',
    responseKey: 'responseEmail',
    keywords: {
      en: ['email', 'mail', 'e-mail', 'my email', 'email address', 'why email', 'email saved', 'email stored', 'phone number', 'my phone'],
      he: ['מייל', 'אימייל', 'כתובת מייל', 'דואר', 'למה מייל', 'מייל נשמר', 'דוא"ל', 'טלפון', 'מספר טלפון'],
    },
  },
  {
    id: 'privacy',
    responseKey: 'responsePrivacy',
    keywords: {
      en: ['privacy', 'anonymous', 'who sees', 'my name', 'visible', 'username', 'what name', 'hidden', 'private'],
      he: ['פרטיות', 'אנונימי', 'מי רואה', 'השם שלי', 'גלוי', 'שם משתמש', 'איזה שם', 'חשוף', 'פרטי'],
    },
  },
  {
    id: 'security',
    responseKey: 'responseSecurity',
    keywords: {
      en: ['security', 'secure', 'safe', 'data', 'shared', 'protected', 'hacked', 'breach', 'third party'],
      he: ['אבטחה', 'מאובטח', 'בטוח', 'נתונים', 'מידע', 'מוגן', 'פריצה', 'גורם חיצוני', 'מועבר'],
    },
  },
  {
    id: 'score',
    responseKey: 'responseScore',
    keywords: {
      en: ['score', 'points', 'my score', 'wrong score', 'no score', 'missing points', 'lost points', 'zero score'],
      he: ['ניקוד', 'נקודות', 'הניקוד שלי', 'ניקוד לא נכון', 'אין ניקוד', 'נקודות חסרות', 'איבדתי נקודות'],
    },
  },
  {
    id: 'loading',
    responseKey: 'responseLoading',
    keywords: {
      en: ['loading', 'not loading', 'stuck', 'frozen', 'blank', 'white screen', 'nothing happens', 'slow', 'crash', 'error'],
      he: ['נטען', 'לא נטען', 'תקוע', 'קפוא', 'מסך לבן', 'לא קורה כלום', 'איטי', 'קריסה', 'שגיאה'],
    },
  },
  {
    id: 'language',
    responseKey: 'responseLanguage',
    keywords: {
      en: ['language', 'hebrew', 'english', 'change language', 'rtl', 'direction', 'translate'],
      he: ['שפה', 'עברית', 'אנגלית', 'לשנות שפה', 'תרגום', 'כיוון'],
    },
  },
  {
    id: 'howToPlay',
    responseKey: 'responseHowToPlay',
    keywords: {
      en: ['how to play', 'instructions', 'how does it work', 'what do i do', 'rules', 'help me play', 'guide', 'tutorial'],
      he: ['איך לשחק', 'הוראות', 'איך זה עובד', 'מה לעשות', 'חוקים', 'מדריך', 'הסבר'],
    },
  },
  {
    id: 'connection',
    responseKey: 'responseConnection',
    keywords: {
      en: ['internet', 'connection', 'offline', 'wifi', 'network', 'disconnected', 'no connection', 'lost connection'],
      he: ['אינטרנט', 'חיבור', 'אופליין', 'ווייפי', 'רשת', 'מנותק', 'אין חיבור', 'איבדתי חיבור'],
    },
  },
  {
    id: 'leaderboard',
    responseKey: 'responseLeaderboard',
    keywords: {
      en: ['leaderboard', 'ranking', 'rank', 'top', 'who won', 'winner', 'standings', 'results'],
      he: ['טבלת מובילים', 'דירוג', 'מקום', 'מי ניצח', 'מנצח', 'תוצאות', 'לידרבורד'],
    },
  },
  {
    id: 'timer',
    responseKey: 'responseTimer',
    keywords: {
      en: ['timer', 'time', 'countdown', 'too fast', 'not enough time', 'clock', 'time limit', 'ran out of time'],
      he: ['טיימר', 'זמן', 'ספירה', 'מהר מדי', 'אין מספיק זמן', 'שעון', 'נגמר הזמן'],
    },
  },
  {
    id: 'group',
    responseKey: 'responseGroup',
    keywords: {
      en: ['group', 'team', 'which group', 'wrong group', 'change group', 'my group', 'class', 'branch', 'department'],
      he: ['קבוצה', 'צוות', 'איזה קבוצה', 'קבוצה לא נכונה', 'לשנות קבוצה', 'הקבוצה שלי', 'כיתה', 'סניף', 'מחלקה'],
    },
  },
  // ─── Field troubleshooting sheet (תקלות נפוצות בפעילות) ───
  {
    id: 'kickedOut',
    responseKey: 'responseKickedOut',
    keywords: {
      en: ['kicked out', 'kicked', 'thrown out', 'threw me out', 'logged out', 'log out', 'lost the activity', 'lost my session', 'session expired', 'back to the start', 'have to log in again', 'lost the link', 'no link'],
      he: ['נזרקתי', 'נזרקנו', 'נזרק', 'זרק אותי', 'יצאתי מהפעילות', 'איבדתי את הפעילות', 'חזרתי להתחלה', 'צריך להיכנס מחדש', 'להיכנס שוב', 'אין לי קישור', 'איבדתי את הקישור', 'הקישור לא עובד'],
    },
  },
  {
    id: 'buttonStuck',
    responseKey: 'responseButtonStuck',
    keywords: {
      en: ['button not working', 'button does nothing', 'button doesnt work', 'button is stuck', 'cant press', 'cant tap', 'not responding', 'unresponsive', 'pressed nothing happens'],
      he: ['כפתור לא עובד', 'הכפתור לא עובד', 'כפתור תקוע', 'לא מגיב', 'לחצתי ולא קורה כלום', 'לא מצליח ללחוץ', 'אי אפשר ללחוץ'],
    },
  },
  {
    id: 'taskStuck',
    responseKey: 'responseTaskStuck',
    keywords: {
      en: ['cant solve', 'cannot solve', 'stuck on the task', 'stuck on a task', 'too hard', 'dont know the answer', 'need a hint', 'hint', 'the solution', 'give up'],
      he: ['לא מצליח לפתור', 'לא מצליחים לפתור', 'תקוע במשימה', 'לא מצליח את המשימה', 'קשה מדי', 'לא יודע את התשובה', 'צריך רמז', 'רמז', 'הפתרון', 'לוותר'],
    },
  },
  {
    id: 'videoMissing',
    responseKey: 'responseVideoMissing',
    keywords: {
      en: ['no video', 'video not created', 'video missing', 'video never', 'didnt get the video', 'where is the video', 'collage', 'sms'],
      he: ['לא נוצר סרטון', 'אין סרטון', 'הסרטון לא', 'לא קיבלתי סרטון', 'איפה הסרטון', 'קולאז', 'סמס'],
    },
  },
  {
    id: 'general',
    responseKey: 'responseGeneral',
    keywords: {
      en: ['help', 'support', 'problem', 'issue', 'bug', 'broken', 'fix', 'something wrong', 'doesnt work'],
      he: ['עזרה', 'תמיכה', 'בעיה', 'באג', 'שבור', 'לתקן', 'משהו לא עובד', 'לא עובד'],
    },
  },
];

/**
 * Match user input against predefined topics using keyword scoring.
 * Returns the best match if confidence is above threshold.
 */
export function matchTopic(input: string, lang: Lang): MatchResult | null {
  // ponytail: keywords are only authored in Hebrew and English; any other
  // language matches against the English set. Add a keyword list per language
  // here if the help bot ever needs to match one directly.
  const kw: 'en' | 'he' = lang === 'he' ? 'he' : 'en';
  const normalized = input.toLowerCase().trim();
  if (!normalized) return null;

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const topic of topics) {
    const keywords = [...topic.keywords[kw], ...topic.keywords[kw === 'en' ? 'he' : 'en']];
    let score = 0;
    let matchCount = 0;

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (normalized.includes(kw)) {
        // Longer keyword matches are worth more
        score += kw.length;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Normalize: score relative to input length and match count
      const confidence = Math.min(1, (score / Math.max(normalized.length, 1)) * 0.6 + matchCount * 0.15);

      if (confidence > bestScore) {
        bestScore = confidence;
        bestMatch = {
          topicId: topic.id,
          confidence,
          responseKey: topic.responseKey,
        };
      }
    }
  }

  // Minimum confidence threshold
  if (bestMatch && bestMatch.confidence >= 0.2) {
    return bestMatch;
  }

  return null;
}
