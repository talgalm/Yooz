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
