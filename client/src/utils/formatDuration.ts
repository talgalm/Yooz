import type { Lang } from '../context/LanguageContext';

/**
 * Format a millisecond duration for display, localized to the active language.
 * Hebrew uses full unit words (matching the exported Excel reports), English
 * keeps the compact "5m 3s" form.
 */
export function formatDuration(ms: number | null | undefined, lang: Lang): string {
  if (!ms || ms <= 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (lang === 'he') {
    if (minutes === 0) return `${seconds} שניות`;
    if (seconds === 0) return `${minutes} דקות`;
    return `${minutes}:${String(seconds).padStart(2, '0')} דקות`;
  }

  if (minutes === 0) return `${seconds}s`;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
