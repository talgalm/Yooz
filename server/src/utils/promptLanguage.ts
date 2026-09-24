import { DEFAULT_LANG, isLanguage, languageOf } from './languages';

/**
 * The line that decides what language a model answers a participant in.
 *
 * The persona prompts are written in Hebrew and tell the model, in Hebrew, to
 * answer in Hebrew. Rather than translating those prompts - they are the
 * character's own briefing, and rewriting them would change how it plays - this
 * goes last and says plainly which language the reply is in. A late, explicit
 * instruction is the one the model follows.
 *
 * Empty for the default language: the prompt already says so, and a redundant
 * English sentence in an otherwise Hebrew prompt only invites the model to
 * switch.
 */
export function replyLanguageInstruction(lang: string): string {
  if (!lang || lang === DEFAULT_LANG || !isLanguage(lang)) return '';
  return `Reply only in ${languageOf(lang).name}. This overrides any earlier instruction about which language to use. Keep the character, the tone and the length exactly as described above.`;
}
