import assert from 'assert';
import { detectTargetHint, generateFallbackSpec } from './tutorials';

type Route =
  | 'ACTIVITY_CREATE' | 'GAME_CREATE' | 'STATION_CREATE'
  | 'DUPLICATE' | 'PARTICIPANT' | 'SEARCH' | 'USERS' | 'STATS' | 'LIBRARY'
  | 'STATIONS_VIEW' | 'GAMES_VIEW' | 'TABS' | 'NONE';

function classify(h: string): Route {
  if (!h) return 'NONE';
  if (/participant play flow/.test(h)) return 'PARTICIPANT';
  if (/you duplicate/.test(h)) return 'DUPLICATE';
  if (/Activities tab search/.test(h)) return 'SEARCH';
  if (/the Users tab/.test(h)) return 'USERS';
  if (/Reports\/Statistics/.test(h)) return 'STATS';
  if (/the Library tab/.test(h)) return 'LIBRARY';
  if (/creating a NEW ACTIVITY/.test(h)) return 'ACTIVITY_CREATE';
  if (/the Create Game flow/.test(h)) return 'GAME_CREATE';
  if (/the Create Station flow/.test(h)) return 'STATION_CREATE';
  if (/the Stations tab\./.test(h)) return 'STATIONS_VIEW';
  if (/the Games management screen/.test(h)) return 'GAMES_VIEW';
  if (/the dashboard tabs/.test(h)) return 'TABS';
  return 'NONE';
}

const cases: [string, Route][] = [
  ['צור לי סרטון כיצד מקימים פעילות חדשה עם תחנת משחק של 3 שאלות דמיוניות', 'ACTIVITY_CREATE'],
  ['איך יוצרים פעילות חדשה עם משחק טריוויה', 'ACTIVITY_CREATE'],
  ['צור פעילות חדשה עם תחנה', 'ACTIVITY_CREATE'],
  ['בונים פעילות עם פאזל', 'ACTIVITY_CREATE'],
  ['how to create a new activity with a trivia game of 3 questions', 'ACTIVITY_CREATE'],
  ['how do I build a new activity with a game', 'ACTIVITY_CREATE'],
  ['set up a new activity', 'ACTIVITY_CREATE'],

  ['צור פעילות חדשה', 'ACTIVITY_CREATE'],
  ['create an activity', 'ACTIVITY_CREATE'],

  ['צור משחק טריוויה חדש', 'GAME_CREATE'],
  ['create a puzzle game', 'GAME_CREATE'],
  ['צור תחנת טקסט', 'STATION_CREATE'],
  ['create a video station', 'STATION_CREATE'],

  ['שכפל פעילות קיימת', 'DUPLICATE'],
  ['duplicate a station', 'DUPLICATE'],

  ['איך נכנסים לפעילות כמשתתף', 'PARTICIPANT'],
  ['show the player experience by scanning the QR', 'PARTICIPANT'],

  ['חיפוש פעילות לפי שם', 'SEARCH'],
  ['ניהול משתמשים והרשאות', 'USERS'],
  ['הצג דוחות וסטטיסטיקות', 'STATS'],
  ['show me the statistics dashboard', 'STATS'],
  ['ייצוא פריט מהספרייה', 'LIBRARY'],
  ['הראה לי את לשונית התחנות', 'STATIONS_VIEW'],
  ['הראה את כל המשחקים', 'GAMES_VIEW'],
  ['סיור בלשוניות המערכת', 'TABS'],

  ['הסבר כללי על המערכת', 'NONE'],
  ['', 'NONE'],
];

let failures = 0;
for (const [desc, expected] of cases) {
  const got = classify(detectTargetHint('', desc));
  if (got !== expected) { failures++; console.log(`FAIL  expected=${expected} got=${got}  ::  "${desc}"`); }
}

const bug = detectTargetHint('', 'צור לי סרטון כיצד מקימים פעילות חדשה עם תחנת משחק של 3 שאלות דמיוניות');
assert(!/do NOT drift to "create activity"/.test(bug), 'activity-create must not forbid create');
assert(/Trivia|טריוויה/.test(bug), 'compound game request should surface the game to build/select');

assert(failures === 0, `${failures} case(s) failed`);

const fb = (desc: string) => generateFallbackSpec('', desc, '/tmp/n.json');
assert(fb('צור פעילות חדשה עם משחק טריוויה').includes('צור פעילות'), 'HE fallback: create-activity block');
assert(fb('הצג סטטיסטיקות').includes('סטטיסטיקות'), 'HE fallback: stats block');
assert(fb('איך משתתף נכנס לפעילות').includes('/play/'), 'HE fallback: participant flow');
assert(fb('שכפל תחנה קיימת').includes('עותק של התחנה'), 'HE fallback: duplicate station');
assert(fb('צור פעילות חדשה').includes("import { test }") && fb('צור פעילות חדשה').includes('showCaption'), 'HE fallback: valid spec shape');

console.log(`✅ all ${cases.length} cases + 2 invariants + 5 Hebrew-fallback checks passed`);
