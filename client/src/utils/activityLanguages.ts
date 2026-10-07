import { LANGS, type Lang } from './languages';

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

const STARTED_KEY = 'yooz_activity_started_langs';
const STARTED_MAX = 100;

export function nextStartLanguage(
  started: string[],
  code: string | undefined,
  defaultLanguage: string | undefined,
): { lang: Lang | null; started: string[] } {
  const lang = LANGS.find((l) => l.code === defaultLanguage)?.code ?? null;
  if (!code || !lang || started.includes(code)) return { lang: null, started };
  return { lang, started: [...started, code].slice(-STARTED_MAX) };
}

function readStarted(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STARTED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function takeStartLanguage(code: string | undefined, defaultLanguage: string | undefined): Lang | null {
  const next = nextStartLanguage(readStarted(), code, defaultLanguage);
  if (next.lang) {
    try {
      localStorage.setItem(STARTED_KEY, JSON.stringify(next.started));
    } catch {
      return next.lang;
    }
  }
  return next.lang;
}
