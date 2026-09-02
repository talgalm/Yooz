export async function manageApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('yz_manage_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('yz_manage_unauthorized'));
    }
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || 'Request failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}
