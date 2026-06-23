import { enqueueOfflineRequest, ensureOfflineQueueListeners, flushOfflineQueue } from './offlineQueue';

export { isRetryableFetchError } from './offlineQueue';

function retryDelayMs(attempt: number): number {
  return Math.min(15_000, 1000 * Math.pow(2, attempt));
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('yooz_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

/** Retry transient network failures (load tests showed EOF on progress PATCH under burst). */
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
 * connectivity returns. Never throws — callers keep their existing flow.
 */
export async function apiFetchPersistSilent(url: string, options: RequestInit = {}): Promise<void> {
  ensureOfflineQueueListeners();
  try {
    await apiFetchWithRetry(url, options, 8);
    void flushOfflineQueue();
  } catch {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      enqueueOfflineRequest(url, options);
    }
  }
}
