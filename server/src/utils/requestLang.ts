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
export const SUPPORTED_LANGS = ['he', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function normaliseLang(raw: unknown): Lang {
  if (typeof raw !== 'string') return 'he';
  const code = raw.trim().toLowerCase().split(/[-_,;]/)[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? (code as Lang) : 'he';
}

export function readLang(req: Pick<Request, 'headers' | 'query'>): Lang {
  const header = req.headers?.['x-yooz-lang'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return normaliseLang(fromHeader ?? (req.query?.lang as string | undefined));
}

/**
 * The languages an activity is offered in, as they should be stored.
 *
 * `undefined` in means the caller said nothing about languages, and the stored
 * value is left alone. An empty array in means "Hebrew only" and is stored as
 * such: `$set` skips `undefined`, so without this distinction unchecking the
 * last language in the admin would silently keep the previous list.
 */
export function sanitiseLanguages(raw: unknown): Lang[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((l): l is Lang => typeof l === 'string' && l !== 'he' && (SUPPORTED_LANGS as readonly string[]).includes(l));
}
