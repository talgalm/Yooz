/**
 * Every language the server knows, one row each. Everything that used to hold
 * its own partial list reads this one: accepted codes (`requestLang`), what the
 * model translates into (`contentTranslation`), what a character answers in
 * (`promptLanguage`) and which voice reads it (`routes/tts`). Those lists used
 * to disagree, and a language with no voice made the speech endpoint return an
 * empty clip - silence, with nothing to see.
 *
 * The matching client row is in `client/src/utils/languages.ts`;
 * `languages.test.ts` fails if the two drift apart.
 */
export interface Language {
  code: string;
  name: string;
  locale: string;
  /** Which way it reads; the server renders HTML of its own (the collage share page). */
  dir: 'rtl' | 'ltr';
  /** Azure neural voices; the region's list is at /cognitiveservices/voices/list. */
  voices: { man: string; woman: string };
}

export const LANGUAGES = [
  {
    code: 'he',
    name: 'Hebrew',
    locale: 'he-IL',
    dir: 'rtl',
    voices: { man: 'he-IL-AvriNeural', woman: 'he-IL-HilaNeural' },
  },
  {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    dir: 'ltr',
    voices: { man: 'en-US-GuyNeural', woman: 'en-US-JennyNeural' },
  },
] as const satisfies readonly Language[];

export type Lang = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANG: Lang = 'he';

export const LANGUAGE_CODES: readonly Lang[] = LANGUAGES.map((l) => l.code);

export function languageOf(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isLanguage(code: string): code is Lang {
  return (LANGUAGE_CODES as readonly string[]).includes(code);
}
