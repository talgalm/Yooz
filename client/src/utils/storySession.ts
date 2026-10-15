import { participantSessionId } from './participantActivity';

const STORY_SESSION_PREFIX = 'yooz_session_';

export function storySessionKey(code: string): string {
  return `${STORY_SESSION_PREFIX}${code.trim()}_${participantSessionId()}`;
}

export function forgetAllStorySessions(): void {
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (let i = store.length - 1; i >= 0; i -= 1) {
        const key = store.key(i);
        if (key?.startsWith(STORY_SESSION_PREFIX)) store.removeItem(key);
      }
    } catch {
      continue;
    }
  }
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
