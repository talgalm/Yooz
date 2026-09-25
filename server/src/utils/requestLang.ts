import type { Request } from 'express';

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
