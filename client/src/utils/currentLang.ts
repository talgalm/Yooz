
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

export function allLangStorageKeys(): string[] {
  return Object.values(KEYS);
}

function path(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

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
  }
}

export function currentLang(pathname: string = path()): string {
  return langInScope(langScope(pathname));
}

export function storeLang(lang: string, pathname: string = path()): void {
  storeLangInScope(langScope(pathname), lang);
}

export function langHeader(): Record<string, string> {
  return { 'X-Yooz-Lang': currentLang() };
}

const LOCALES: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
};

export function currentLocale(lang: string = currentLang()): string {
  return LOCALES[lang] || LOCALES.he;
}
