export type DurationUnit = 'hours' | 'minutes';

export function parseDuration(input: string, unit: DurationUnit = 'hours'): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;

  const clock = raw.match(/^(\d+):([0-5]?\d)$/);
  if (clock) {
    const minutes = Number(clock[1]) * 60 + Number(clock[2]);
    return minutes > 0 ? minutes : null;
  }

  const suffixed = raw.match(/^(\d*\.?\d+)\s*([a-zA-Z֐-׿]+)$/);
  if (suffixed) {
    const value = Number(suffixed[1]);
    const suffix = suffixed[2].toLowerCase();
    if (!Number.isFinite(value) || value <= 0) return null;
    if (/^(m|min|mins|minute|minutes|ד|דק|דקה|דקות)$/.test(suffix)) return Math.round(value);
    if (/^(h|hr|hrs|hour|hours|ש|שע|שעה|שעות)$/.test(suffix)) return Math.round(value * 60);
    return null;
  }

  const bare = Number(raw);
  if (!Number.isFinite(bare) || bare <= 0) return null;
  return Math.round(unit === 'hours' ? bare * 60 : bare);
}

export function formatHours(minutes: number): string {
  return String(Math.round((minutes / 60) * 10) / 10);
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
