/**
 * Every language the app offers, one row each.
 *
 * Adding a language is adding a row here and the matching row in
 * `server/src/utils/languages.ts` - nothing else. The existing `.i18n.ts` files
 * keep working untouched; keys the new language does not carry fall back to the
 * default one.
 *
 * It lives in `utils` rather than in `LanguageContext` because the code that
 * needs it is not all React: `apiFetch` picks a header from it, the module
 * cache keys on it, the avatar's own fetch helper reads it. `LanguageContext`
 * re-exports it, so every component that already imports `LANGS` from there
 * still can.
 *
 *   `label`  the language's name in itself - never translated, so a new
 *            language needs no new i18n key to appear in the switchers.
 *   `short`  that name cut down to what fits inside a round button.
 *   `dir`    which way it reads; drives `<html dir>` and every mirrored layout.
 *   `locale` BCP-47 tag, for the browser's own speech synthesis.
 */
export const LANGS = [
  { code: 'he', label: 'עברית', short: 'עב', flag: '🇮🇱', dir: 'rtl', locale: 'he-IL' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];

/** The language everything is authored in, and the fallback for every other. */
export const DEFAULT_LANG = 'he';

export function languageOf(code: string): (typeof LANGS)[number] {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}
