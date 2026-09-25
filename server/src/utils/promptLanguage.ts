import { SUPPORTED_LANGS, type Lang } from './requestLang';

const NAMES: Record<Lang, string> = {
  he: 'Hebrew',
  en: 'English',
};

export function replyLanguageInstruction(lang: string): string {
  if (!lang || lang === 'he' || !(SUPPORTED_LANGS as readonly string[]).includes(lang)) return '';
  const name = NAMES[lang as Lang];
  return `Reply only in ${name}. This overrides any earlier instruction about which language to use. Keep the character, the tone and the length exactly as described above.`;
}
