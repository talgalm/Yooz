export const LANGS = [
  { code: 'he', label: 'עברית', short: 'עב', flag: '🇮🇱', dir: 'rtl', locale: 'he-IL' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];

export const DEFAULT_LANG = 'he';

export function languageOf(code: string): (typeof LANGS)[number] {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}
