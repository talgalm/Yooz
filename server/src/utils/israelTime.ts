const ISRAEL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function israelOffsetMs(at: Date): number {
  const wall = ISRAEL_PARTS.format(at).replace(', ', 'T').replace('T24:', 'T00:');
  return Date.parse(`${wall}Z`) - at.getTime();
}

export function startOfIsraelDay(day: string): Date {
  const naive = Date.parse(`${day}T00:00:00Z`);
  const firstPass = new Date(naive - israelOffsetMs(new Date(naive)));
  return new Date(naive - israelOffsetMs(firstPass));
}

export function startOfTodayIsrael(now = new Date()): Date {
  return startOfIsraelDay(israelDayString(now));
}

export function israelDayString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function israelHour(date = new Date()): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const hour = Number(formatted);
  return hour === 24 ? 0 : hour;
}

export function israelDayOfWeek(date = new Date()): number {
  return new Date(`${israelDayString(date)}T12:00:00Z`).getUTCDay();
}

export function israelDayRange(day: string): { start: Date; end: Date } {
  const start = startOfIsraelDay(day);
  const nextDay = israelDayString(new Date(start.getTime() + 36 * 60 * 60 * 1000));
  return { start, end: startOfIsraelDay(nextDay) };
}

export function isIsraelDayString(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && israelDayString(startOfIsraelDay(day)) === day;
}

export function israelDayFromDdMmYyyy(raw: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((raw || '').trim());
  if (!m) return null;
  const day = `${m[3]}-${m[2]}-${m[1]}`;
  return isIsraelDayString(day) ? day : null;
}
