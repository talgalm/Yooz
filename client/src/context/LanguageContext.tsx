import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  langInScope,
  langScope,
  storeLangInScope,
  type LangScope,
} from '../utils/currentLang';
import { LANGS, DEFAULT_LANG, type Lang } from '../utils/languages';

export { LANGS, DEFAULT_LANG };
export type { Lang };

type PartialTexts<T> =
  T extends (...args: never[]) => unknown ? T
  : T extends readonly unknown[] ? T
  : T extends object ? { [K in keyof T]?: PartialTexts<T[K]> }
  : T;

export type Texts<T> = { he: T } & { [K in Exclude<Lang, typeof DEFAULT_LANG>]?: PartialTexts<T> };

function langDir(lang: Lang): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';
}

function readStoredLang(scope: LangScope): Lang {
  const stored = langInScope(scope);
  return LANGS.some((l) => l.code === stored) ? (stored as Lang) : DEFAULT_LANG;
}

interface LanguageContextType {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  restrictToLanguages: (langs: string[] | null) => void;
  enterScopeOf: (pathname: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<LangScope>(() =>
    langScope(typeof window === 'undefined' ? '/' : window.location.pathname)
  );
  const [chosen, setChosen] = useState<Lang>(() => readStoredLang(scope));
  const [activityLangs, setActivityLangs] = useState<string[] | null>(null);

  const restricted = activityLangs !== null && chosen !== DEFAULT_LANG && !activityLangs.includes(chosen);
  const lang: Lang = restricted ? DEFAULT_LANG : chosen;
  const dir = langDir(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback(
    (next: Lang) => {
      storeLangInScope(scope, next);
      setChosen(next);
    },
    [scope]
  );

  const enterScopeOf = useCallback((pathname: string) => {
    const next = langScope(pathname);
    setScope((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    setChosen(readStoredLang(scope));
  }, [scope]);

  return (
    <LanguageContext.Provider
      value={{ lang, dir, setLang, restrictToLanguages: setActivityLangs, enterScopeOf }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function fillFrom<T>(fallback: T, override: unknown): T {
  if (override === undefined) return fallback;
  if (!isPlainObject(fallback) || !isPlainObject(override)) return override as T;
  const out: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(override)) out[key] = fillFrom(fallback[key], override[key]);
  return out as T;
}

const mergedCache = new WeakMap<object, Partial<Record<Lang, unknown>>>();

export function useTranslations<T>(texts: Texts<T>): T {
  return translate(texts, useLang().lang);
}

export function translate<T>(texts: Texts<T>, lang: Lang): T {
  if (lang === DEFAULT_LANG) return texts.he;

  let byLang = mergedCache.get(texts);
  if (!byLang) mergedCache.set(texts, (byLang = {}));
  if (!(lang in byLang)) byLang[lang] = fillFrom(texts.he, texts[lang]);
  return byLang[lang] as T;
}
