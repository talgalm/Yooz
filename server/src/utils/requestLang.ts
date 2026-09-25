import type { Request } from 'express';

/**
 * The language a participant is running in.
 *
 * The client sends it on every call (`X-Yooz-Lang`, set from the same stored
 * choice the UI reads), and a query parameter is accepted too so a link can
 * carry it and so it is easy to try by hand.
 *
 * Unknown values fall back to Hebrew rather than erroring: a stale or hand-typed
 * value should serve the activity as authored, not break it.
 */
import { DEFAULT_LANG, isLanguage, LANGUAGE_CODES, type Lang } from './languages';

/** Derived from the one registry; see `languages.ts` for how to add one. */
export const SUPPORTED_LANGS = LANGUAGE_CODES;
export type { Lang };

export function normaliseLang(raw: unknown): Lang {
  if (typeof raw !== 'string') return DEFAULT_LANG;
  const code = raw.trim().toLowerCase().split(/[-_,;]/)[0];
  return isLanguage(code) ? code : DEFAULT_LANG;
}

export function readLang(req: Pick<Request, 'headers' | 'query'>): Lang {
  const header = req.headers?.['x-yooz-lang'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return normaliseLang(fromHeader ?? (req.query?.lang as string | undefined));
}

export function sanitiseLanguages(raw: unknown): Lang[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  // The default language is implicit - an activity is always offered in it.
  return raw.filter((l): l is Lang => typeof l === 'string' && l !== DEFAULT_LANG && isLanguage(l));
}
