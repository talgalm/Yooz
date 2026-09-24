/**
 * Every language the server knows, one row each.
 *
 * Adding a language is adding a row here. Everything that used to hold its own
 * partial list now reads this one: which codes are accepted (`requestLang`),
 * what the model is told to translate into (`contentTranslation`), what an AI
 * character is told to answer in (`promptLanguage`), and which voice reads it
 * out loud (`routes/tts`). Those lists used to disagree - a language could be
 * accepted everywhere and still have no voice, which the speech endpoint
 * answered with an empty clip and total silence.
 *
 * The matching client-side row lives in `client/src/utils/languages.ts`, and
 * `languages.test.ts` fails if the two ever drift apart.
 *
 * `name` is the language's name **in English**, because it goes into prompts
 * written in English. The participant never sees it; they see `label` from the
 * client registry, which is the language's name in itself.
 */
export interface Language {
  code: string;
  /** English name, for model prompts. */
  name: string;
  /** BCP-47 tag, for speech synthesis. */
  locale: string;
  /** Azure neural voices. Listed at <region>.tts.speech.microsoft.com/cognitiveservices/voices/list */
  voices: { man: string; woman: string };
}

export const LANGUAGES = [
  {
    code: 'he',
    name: 'Hebrew',
    locale: 'he-IL',
    voices: { man: 'he-IL-AvriNeural', woman: 'he-IL-HilaNeural' },
  },
  {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    voices: { man: 'en-US-GuyNeural', woman: 'en-US-JennyNeural' },
  },
] as const satisfies readonly Language[];

export type Lang = (typeof LANGUAGES)[number]['code'];

/** The language everything is authored in, and what anything unknown falls back to. */
export const DEFAULT_LANG: Lang = 'he';

export const LANGUAGE_CODES: readonly Lang[] = LANGUAGES.map((l) => l.code);

export function languageOf(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isLanguage(code: string): code is Lang {
  return (LANGUAGE_CODES as readonly string[]).includes(code);
}
