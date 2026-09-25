/**
 * Which language preference applies here, and where it is stored.
 *
 * The activity, the staff panels and the marketing site are three products on
 * one origin, and they shared one stored preference - so reading the marketing
 * site in English put the next activity into English, and an admin's panel
 * language reached participants. They are separate choices, stored separately.
 *
 * The scope comes from the path rather than React state, because it is needed
 * outside React too and a path needs nothing kept in sync.
 */

import { DEFAULT_LANG, languageOf } from './languages';

export type LangScope = 'participant' | 'admin' | 'site';

const KEYS: Record<LangScope, string> = {
  participant: 'yooz_participant_lang',
  admin: 'yooz_admin_lang',
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

/** Every key this module owns. */
export function allLangStorageKeys(): string[] {
  return Object.values(KEYS);
}

function path(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/** The language stored for one scope; the default when storage is blocked. */
export function langInScope(scope: LangScope): string {
  try {
    return localStorage.getItem(langStorageKey(scope)) || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
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

/** The BCP-47 tag, for `SpeechSynthesisUtterance.lang`. */
export function currentLocale(lang: string = currentLang()): string {
  return languageOf(lang).locale;
}
