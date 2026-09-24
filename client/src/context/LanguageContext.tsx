import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  langInScope,
  langScope,
  storeLangInScope,
  type LangScope,
} from '../utils/currentLang';
import { LANGS, DEFAULT_LANG, type Lang } from '../utils/languages';

/**
 * The registry itself lives in `utils/languages`, so that code outside React
 * can read it too. Re-exported here because most of the app has always
 * imported `LANGS` from this module.
 */
export { LANGS, DEFAULT_LANG };
export type { Lang };

/**
 * A language other than Hebrew may translate as much or as little as it likes —
 * anything it leaves out is filled in from Hebrew at runtime. Functions and
 * arrays are all-or-nothing, matching how `fillFrom` merges them.
 */
type PartialTexts<T> =
  T extends (...args: never[]) => unknown ? T
  : T extends readonly unknown[] ? T
  : T extends object ? { [K in keyof T]?: PartialTexts<T[K]> }
  : T;

/**
 * The shape of a component's `.i18n.ts` export. Hebrew is required and complete;
 * every other language supplies whatever it has translated so far.
 */
export type Texts<T> = { he: T } & { [K in Exclude<Lang, typeof DEFAULT_LANG>]?: PartialTexts<T> };

function langDir(lang: Lang): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';
}

/**
 * The choice stored for the part of the app this page belongs to - the activity,
 * the staff panels, or the marketing site. They are three separate preferences;
 * see `utils/currentLang` for why.
 */
function readStoredLang(scope: LangScope): Lang {
  const stored = langInScope(scope);
  // Guards a stale value left behind by a language that no longer exists.
  return LANGS.some((l) => l.code === stored) ? (stored as Lang) : DEFAULT_LANG;
}

interface LanguageContextType {
  /** The language actually rendered - the choice, unless an activity narrows it. */
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  /**
   * Called by the participant activity scope with the languages that activity
   * was prepared in, and with `null` on the way out of it.
   */
  restrictToLanguages: (langs: string[] | null) => void;
  /**
   * Called by `LangScopeSync` on every navigation. Moving between the activity,
   * the staff panels and the marketing site moves between three separate
   * preferences, and a client-side navigation does not reload the page.
   */
  useScopeOf: (pathname: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  /**
   * Which of the three preferences this page reads and writes. Taken from the
   * path at boot; the provider sits above the router, so `LangScopeSync` keeps
   * it current from inside.
   */
  const [scope, setScope] = useState<LangScope>(() =>
    langScope(typeof window === 'undefined' ? '/' : window.location.pathname)
  );
  const [chosen, setChosen] = useState<Lang>(() => readStoredLang(scope));
  /**
   * The languages the activity being played was prepared in, or `null` outside
   * an activity and before its config has arrived. Inside an activity that was
   * never translated, everything - station names, buttons, help - reads in
   * Hebrew, whatever the device was set to: half an activity in English is
   * worse than all of it in the language it was written in.
   */
  const [activityLangs, setActivityLangs] = useState<string[] | null>(null);

  const restricted = activityLangs !== null && chosen !== DEFAULT_LANG && !activityLangs.includes(chosen);
  const lang: Lang = restricted ? DEFAULT_LANG : chosen;
  const dir = langDir(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  /**
   * Only the participant's own choice is stored; a restriction is not theirs.
   * Written here rather than in an effect on `chosen`, so that switching scope
   * cannot race the write and stamp one product's language onto another's key.
   */
  const setLang = useCallback(
    (next: Lang) => {
      storeLangInScope(scope, next);
      setChosen(next);
    },
    [scope]
  );

  /** A navigation into another part of the app adopts that part's preference. */
  const useScopeOf = useCallback((pathname: string) => {
    const next = langScope(pathname);
    setScope((prev) => (prev === next ? prev : next));
  }, []);

  // Re-reads on a scope change. On mount this reads the same value the state
  // was seeded with, so it costs nothing.
  useEffect(() => {
    setChosen(readStoredLang(scope));
  }, [scope]);

  return (
    <LanguageContext.Provider
      value={{ lang, dir, setLang, restrictToLanguages: setActivityLangs, useScopeOf }}
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

/** `override` wins wherever it says something; `fallback` fills in the rest. */
export function fillFrom<T>(fallback: T, override: unknown): T {
  if (override === undefined) return fallback;
  if (!isPlainObject(fallback) || !isPlainObject(override)) return override as T;
  const out: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(override)) out[key] = fillFrom(fallback[key], override[key]);
  return out as T;
}

// Keyed by the module-level `texts` object, so each (texts, lang) pair merges
// once for the life of the page and `t` keeps a stable identity across renders
// (some components list `t` in a hook dependency array).
const mergedCache = new WeakMap<object, Partial<Record<Lang, unknown>>>();

/**
 * Hook to get translations for a component.
 * Pass an object like `{ he: { ... }, en: { ... } }` and it returns the active
 * language's texts, with anything it is missing filled in from Hebrew.
 *
 * Usage:
 *   import { texts } from './MyComponent.i18n';
 *   const t = useTranslations(texts);
 */
export function useTranslations<T>(texts: Texts<T>): T {
  return translate(texts, useLang().lang);
}

/**
 * The non-hook twin of `useTranslations`, for the utilities that format text
 * outside a component and are handed the language by their caller.
 */
export function translate<T>(texts: Texts<T>, lang: Lang): T {
  if (lang === DEFAULT_LANG) return texts.he;

  let byLang = mergedCache.get(texts);
  if (!byLang) mergedCache.set(texts, (byLang = {}));
  if (!(lang in byLang)) byLang[lang] = fillFrom(texts.he, texts[lang]);
  return byLang[lang] as T;
}
