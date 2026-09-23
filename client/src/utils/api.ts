import {
  enqueueOfflineRequest,
  ensureOfflineQueueListeners,
  flushOfflineQueue,
} from './offlineQueue';
import { HttpError, isRetryableFetchError, retryDelayMs } from './fetchErrors';

export { isRetryableFetchError } from './fetchErrors';

/**
 * The language the participant picked, read from the same store the UI reads.
 * It travels on every call so the server can translate the activity's own
 * content - station names, riddles, questions - to match the interface.
 * Storage can throw in a locked-down browser, and Hebrew is the default anyway.
 */
function currentLang(): string {
  try {
    return localStorage.getItem('yooz_lang') || 'he';
  } catch {
    return 'he';
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('yooz_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Yooz-Lang': currentLang(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new HttpError(error.error || 'Request failed', res.status);
  }

  return res.json();
}

/** Retry transient network failures and gateway overload (502/503/504/429). */
export async function apiFetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 6,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiFetch<T>(url, options);
    } catch (err) {
      lastError = err;
      if (!isRetryableFetchError(err) || attempt >= retries - 1) break;
      await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
    }
  }
  throw lastError;
}

/**
 * Best-effort write: retry on the wire, then queue locally and flush when
 * connectivity returns. Returns true when the server acknowledged the write.
 */
export async function apiFetchPersistSilent(url: string, options: RequestInit = {}): Promise<boolean> {
  ensureOfflineQueueListeners();
  try {
    await apiFetchWithRetry(url, options, 8);
    void flushOfflineQueue();
    return true;
  } catch (err) {
    const method = (options.method || 'GET').toUpperCase();
    // Queue only what a later attempt could still deliver. A non-retryable 4xx
    // is a permanent rejection — queueing it just replays the same failure.
    if (
      isRetryableFetchError(err)
      && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')
    ) {
      enqueueOfflineRequest(url, options);
    }
    return false;
  }
}
