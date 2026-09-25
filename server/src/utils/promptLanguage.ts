import { DEFAULT_LANG, isLanguage, languageOf } from './languages';

export function replyLanguageInstruction(lang: string): string {
  if (!lang || lang === DEFAULT_LANG || !isLanguage(lang)) return '';
  return `Reply only in ${languageOf(lang).name}. This overrides any earlier instruction about which language to use. Keep the character, the tone and the length exactly as described above.`;
}
