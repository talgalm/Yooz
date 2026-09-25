import { DEFAULT_LANG, isLanguage, languageOf } from './languages';

/**
 * The line that decides what language a model answers a participant in. The
 * persona prompts are the character's own briefing and are left alone; this
 * goes last, because a late explicit instruction is the one a model follows.
 * Empty for the default language, where the prompt already says so.
 */
export function replyLanguageInstruction(lang: string): string {
  if (!lang || lang === DEFAULT_LANG || !isLanguage(lang)) return '';
  return `Reply only in ${languageOf(lang).name}. This overrides any earlier instruction about which language to use. Keep the character, the tone and the length exactly as described above.`;
}
