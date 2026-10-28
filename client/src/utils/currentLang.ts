
import { DEFAULT_LANG, LANGS, languageOf, type Lang } from './languages';

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

const PREFIXED_LANGS: readonly string[] = LANGS.map((l) => l.code).filter((code) => code !== DEFAULT_LANG);

export function langPrefixOf(pathname: string): Lang | null {
  const firstSegment = pathname.split('/')[1] ?? '';
  return PREFIXED_LANGS.includes(firstSegment) ? (firstSegment as Lang) : null;
}

export function withoutLangPrefix(pathname: string): string {
  const prefix = langPrefixOf(pathname);
  return prefix ? pathname.slice(prefix.length + 1) || '/' : pathname;
}

export function localizedPath(pathname: string, lang: Lang): string {
  const base = withoutLangPrefix(pathname);
  if (lang === DEFAULT_LANG) return base;
  return base === '/' ? `/${lang}` : `/${lang}${base}`;
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
    return localStorage.getItem(langStorageKey(scope)) || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
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

export function currentLocale(lang: string = currentLang()): string {
  return languageOf(lang).locale;
}
