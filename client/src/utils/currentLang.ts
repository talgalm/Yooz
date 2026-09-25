/**
 * Which language preference applies here, and where it is stored.
 *
 * The app is three different products sharing one origin: the activity a
 * participant plays, the panels staff work in, and the public marketing site.
 * They had one stored preference between them, so reading the marketing site in
 * English silently put the next activity into English, and an admin who set the
 * panel to English handed that to participants too. They are separate choices
 * made by different people, so they are stored separately.
 *
 * The scope comes from the path rather than from React state, because it is
 * needed outside React as well - `apiFetch` picks the header from it, the
 * module cache keys on it, the avatar's own fetch helper reads it - and a path
 * is true at the moment it is asked, with nothing to keep in sync.
 */

export type LangScope = 'participant' | 'admin' | 'site';

const KEYS: Record<LangScope, string> = {
  /** Inside an activity: chosen by the participant, narrowed to what the activity offers. */
  participant: 'yooz_participant_lang',
  /** The staff panels - admin, manager, manage, control. */
  admin: 'yooz_admin_lang',
  /** The marketing site and everything else public. */
  site: 'yooz_site_lang',
};

const PARTICIPANT_PATHS = /^\/(play|home|story|mission|portal)(\/|$)/;
const ADMIN_PATHS = /^\/(admin|manager|manage|control)(\/|$)/;

export function langScope(pathname: string): LangScope {
  if (PARTICIPANT_PATHS.test(pathname)) return 'participant';
  if (ADMIN_PATHS.test(pathname)) return 'admin';
  return 'site';
}

export function langStorageKey(scope: LangScope): string {
  return KEYS[scope];
}

/** Every key this module owns, for a clean slate when one is not wanted. */
export function allLangStorageKeys(): string[] {
  return Object.values(KEYS);
}

function path(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/**
 * The language stored for one scope. Hebrew is the default, and is also the
 * answer when storage is unavailable - a locked-down browser must still serve
 * the activity as it was written.
 */
export function langInScope(scope: LangScope): string {
  try {
    return localStorage.getItem(langStorageKey(scope)) || 'he';
  } catch {
    return 'he';
  }
}

export function storeLangInScope(scope: LangScope, lang: string): void {
  try {
    localStorage.setItem(langStorageKey(scope), lang);
  } catch {
    /* storage blocked - the choice lasts for this page only */
  }
}

/** The language in force on the current page. */
export function currentLang(pathname: string = path()): string {
  return langInScope(langScope(pathname));
}

/** Records a choice against the scope of the page it was made on. */
export function storeLang(lang: string, pathname: string = path()): void {
  storeLangInScope(langScope(pathname), lang);
}

/** The header every call carries, so the server answers in the same language. */
export function langHeader(): Record<string, string> {
  return { 'X-Yooz-Lang': currentLang() };
}

/**
 * The BCP-47 tag for a language, for anything that speaks or reads text out
 * loud rather than sending it to the server: `SpeechSynthesisUtterance.lang`,
 * and the SSML locale the voice is picked from.
 */
const LOCALES: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
};

export function currentLocale(lang: string = currentLang()): string {
  return LOCALES[lang] || LOCALES.he;
}
