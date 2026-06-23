function isRetryableFetchError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return false;
  // fetch() rejects with TypeError on network drops / timeouts — not on HTTP 4xx/5xx.
  return err instanceof TypeError;
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
  retries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiFetch<T>(url, options);
    } catch (err) {
      lastError = err;
      if (!isRetryableFetchError(err) || attempt >= retries - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}
