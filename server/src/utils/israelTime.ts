/**
 * UTC instant of midnight (start of today) in Israel wall-clock time.
 * Computed by subtracting Israel H:M:S from `now` — no tz library needed.
 */
export function startOfTodayIsrael(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return new Date(now.getTime() - (get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000);
}
