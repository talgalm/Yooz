const KEY = 'yooz_activity_langs';

/**
 * The languages the current activity was prepared in, remembered from the
 * config the login screen already fetched.
 *
 * The screens after login - the activity home, the journey header - need the
 * same answer to decide whether to offer a language control at all, and none of
 * them loads the activity config for anything else. Remembering it here is one
 * write and one read instead of a fetch per screen.
 *
 * Stored per activity code, so returning to a different activity on the same
 * device never reads the previous one's answer.
 */
export function rememberActivityLanguages(code: string | undefined, langs: string[] | undefined): void {
  if (!code) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ code, langs: langs ?? [] }));
  } catch {
    /* storage full / private mode - the control simply stays hidden */
  }
}

/** `null` when this device has not seen the activity's config yet - unknown, not "none". */
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
