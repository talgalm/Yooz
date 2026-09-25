import {
  enqueueOfflineRequest,
  ensureOfflineQueueListeners,
  flushOfflineQueue,
} from './offlineQueue';
import { HttpError, isRetryableFetchError, retryDelayMs } from './fetchErrors';
import { currentLang } from './currentLang';

export { isRetryableFetchError } from './fetchErrors';

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

export async function apiFetchPersistSilent(url: string, options: RequestInit = {}): Promise<boolean> {
  ensureOfflineQueueListeners();
  try {
    await apiFetchWithRetry(url, options, 8);
    void flushOfflineQueue();
    return true;
  } catch (err) {
    const method = (options.method || 'GET').toUpperCase();
    if (
      isRetryableFetchError(err)
      && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')
    ) {
      enqueueOfflineRequest(url, options);
    }
    return false;
  }
}
