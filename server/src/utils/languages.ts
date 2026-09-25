export interface Language {
  code: string;
  name: string;
  locale: string;
  dir: 'rtl' | 'ltr';
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
