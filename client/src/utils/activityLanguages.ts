const KEY = 'yooz_activity_langs';

export function rememberActivityLanguages(code: string | undefined, langs: string[] | undefined): void {
  if (!code) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ code, langs: langs ?? [] }));
  } catch {
  }
}

export function activityLanguages(code: string | undefined): string[] | null {
  if (!code) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { code?: string; langs?: unknown };
    if (saved.code !== code || !Array.isArray(saved.langs)) return null;
    return saved.langs.filter((l): l is string => typeof l === 'string');
  } catch {
    return null;
  }
}
