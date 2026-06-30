// Decode a JWT payload as UTF-8. `atob` returns a byte-string that JSON.parse
// reads as Latin-1, mangling non-ASCII (e.g. Hebrew names → "×§×¢×�×").
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
