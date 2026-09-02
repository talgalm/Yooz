/**
 * Parses what people actually type into an hours box.
 *
 * Deliberately NOT guessing at a bare number's unit — "90" is 90 hours or 90
 * minutes depending on who you ask, and a wrong guess silently corrupts cost.
 * A bare number means whatever `unit` says; every other form states its own unit.
 *
 *   "1:30"  -> 90   (h:mm, always)
 *   "1.5"   -> 90   with unit 'hours'
 *   "90"    -> 90   with unit 'minutes'
 *   "90m"   -> 90   regardless of unit
 *   "2h"    -> 120  regardless of unit
 *   "1.5 ש" -> 90   (Hebrew shorthand)
 */
export type DurationUnit = 'hours' | 'minutes';

export function parseDuration(input: string, unit: DurationUnit = 'hours'): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;

  // h:mm — unambiguous, so it wins over the unit selector.
  const clock = raw.match(/^(\d+):([0-5]?\d)$/);
  if (clock) {
    const minutes = Number(clock[1]) * 60 + Number(clock[2]);
    return minutes > 0 ? minutes : null;
  }

  // An explicit suffix also overrides the selector.
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

/** Minutes as the spec displays them: one decimal hour, never h:mm. */
export function formatHours(minutes: number): string {
  return String(Math.round((minutes / 60) * 10) / 10);
}

/** Compact display for a running timer or a day total. */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
