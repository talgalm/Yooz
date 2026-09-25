export function storySessionKey(code: string): string {
  return `yooz_session_${code.trim()}`;
}

export function loadStorySessionRaw(code: string): string | null {
  const key = storySessionKey(code);
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveStorySessionRaw(code: string, json: string): void {
  const key = storySessionKey(code);
  try {
    sessionStorage.setItem(key, json);
    localStorage.setItem(key, json);
  } catch {
    try {
      sessionStorage.setItem(key, json);
    } catch {
    }
  }
}

export function clearStorySession(code: string): void {
  const key = storySessionKey(code);
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
  }
}
