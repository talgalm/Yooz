export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function israelDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function isStaleDailyResetToken(token: string): boolean {
  try {
    const { dailyReset, iat } = decodeJwtPayload<{ dailyReset?: boolean; iat?: number }>(token);
    if (!dailyReset || !iat) return false;
    return israelDay(new Date(iat * 1000)) !== israelDay(new Date());
  } catch {
    return false;
  }
}
