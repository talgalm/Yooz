/**
 * Every language the app offers, one row each. Adding one is adding a row here
 * and the matching row in `server/src/utils/languages.ts` - nothing else.
 *
 * It lives in `utils` rather than in `LanguageContext` because the code that
 * needs it is not all React (`apiFetch`, the module cache, the avatar's fetch
 * helper). `LanguageContext` re-exports `LANGS`, so existing imports still work.
 *
 *   `label`  the language's name in itself, never translated.
 *   `short`  that name cut down to what fits inside a round button.
 *   `dir`    which way it reads; drives `<html dir>` and every mirrored layout.
 *   `locale` BCP-47 tag, for the browser's own speech synthesis.
 */
export const LANGS = [
  { code: 'he', label: 'עברית', short: 'עב', flag: '🇮🇱', dir: 'rtl', locale: 'he-IL' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];

export const DEFAULT_LANG = 'he';

export function languageOf(code: string): (typeof LANGS)[number] {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}
