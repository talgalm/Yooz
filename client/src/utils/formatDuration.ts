import { translate, type Lang } from '../context/LanguageContext';
import { texts } from './formatDuration.i18n';

export function formatDuration(ms: number | null | undefined, lang: Lang): string {
  if (!ms || ms <= 0) return '—';
  const t = translate(texts, lang);
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return t.seconds(seconds);
  if (seconds === 0) return t.minutes(minutes);
  return t.minutesAndSeconds(minutes, seconds);
}
