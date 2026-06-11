export interface DurationTexts {
  seconds: string;
  minutes: string;
}

export function formatDuration(ms?: number | null, t?: DurationTexts) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  const seconds = t?.seconds ?? 'sec';
  const minutes = t?.minutes ?? 'min';

  if (s < 60) return `${s} ${seconds}`;

  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} ${minutes} ${rest} ${seconds}` : `${m} ${minutes}`;
}
