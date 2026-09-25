const ISRAEL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

/** Israel's UTC offset (ms) at a given instant — +2h in winter, +3h in summer. */
function israelOffsetMs(at: Date): number {
  // "2026-03-27, 15:00:00" → reinterpret those wall-clock parts as if they were
  // UTC; the gap to the real instant is the offset. Some ICU builds render
  // midnight as 24:00, which Date.parse rejects.
  const wall = ISRAEL_PARTS.format(at).replace(', ', 'T').replace('T24:', 'T00:');
  return Date.parse(`${wall}Z`) - at.getTime();
}

/**
 * UTC instant of midnight starting an Israel calendar day (`YYYY-MM-DD`).
 *
 * Resolved in two passes: the first offset is read at the naive instant, the
 * second at the candidate midnight. They differ only on the two DST-transition
 * days, which is exactly when subtracting the elapsed wall-clock time — the
 * obvious one-pass version — lands an hour inside the wrong day.
 */
export function startOfIsraelDay(day: string): Date {
  const naive = Date.parse(`${day}T00:00:00Z`);
  const firstPass = new Date(naive - israelOffsetMs(new Date(naive)));
  return new Date(naive - israelOffsetMs(firstPass));
}

/** UTC instant of midnight (start of today) in Israel wall-clock time. */
export function startOfTodayIsrael(now = new Date()): Date {
  return startOfIsraelDay(israelDayString(now));
}

/**
 * Israel wall-clock calendar day as an `YYYY-MM-DD` string.
 * Used to scope self-service groups to the day they were created — en-CA
 * formats as ISO-like `YYYY-MM-DD`, so no manual assembly needed.
 */
export function israelDayString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/** Israel wall-clock hour (0-23) at a given instant. */
export function israelHour(date = new Date()): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  // Some ICU builds render midnight as "24" rather than "00" — same quirk as israelOffsetMs.
  const hour = Number(formatted);
  return hour === 24 ? 0 : hour;
}

/** Day of week for the Israel calendar day at a given instant, 0 = Sunday. */
export function israelDayOfWeek(date = new Date()): number {
  return new Date(`${israelDayString(date)}T12:00:00Z`).getUTCDay();
}

/** UTC window `[start, end)` covering one Israel calendar day (`YYYY-MM-DD`). */
export function israelDayRange(day: string): { start: Date; end: Date } {
  const start = startOfIsraelDay(day);
  // Step a day and a half forward, then snap back to that day's own midnight —
  // never assume 24h, since a DST day is 23 or 25 hours long.
  const nextDay = israelDayString(new Date(start.getTime() + 36 * 60 * 60 * 1000));
  return { start, end: startOfIsraelDay(nextDay) };
}

/**
 * True for a well-formed `YYYY-MM-DD` that names a real calendar day.
 * Round-tripping through `startOfIsraelDay` is what rejects `2026-02-30`,
 * which the regex alone happily accepts (Date rolls it into March).
 */
export function isIsraelDayString(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && israelDayString(startOfIsraelDay(day)) === day;
}

/**
 * `DD-MM-YYYY` (the format the public register-phone API takes) to the
 * `YYYY-MM-DD` Israel day used everywhere internally. `null` when the input
 * isn't a real calendar day — `31-02-2026` included, since `isIsraelDayString`
 * rejects what `Date` would silently roll into March.
 */
export function israelDayFromDdMmYyyy(raw: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((raw || '').trim());
  if (!m) return null;
  const day = `${m[3]}-${m[2]}-${m[1]}`;
  return isIsraelDayString(day) ? day : null;
}
