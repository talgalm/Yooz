import type { Request } from 'express';

import { DEFAULT_LANG, isLanguage, LANGUAGE_CODES, type Lang } from './languages';

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
  return raw.filter((l): l is Lang => typeof l === 'string' && l !== DEFAULT_LANG && isLanguage(l));
}
