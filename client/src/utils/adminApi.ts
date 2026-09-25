export async function adminApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('yooz_admin_token');

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
      window.dispatchEvent(new Event('yooz_admin_unauthorized'));
    }
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || 'Request failed') as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = error;
    throw err;
  }

  return res.json();
}

export async function adminUploadFile(file: File, folder?: string): Promise<{
  url: string;
  publicId: string;
  resourceType: string;
  fileName?: string;
  format?: string;
}> {
  const token = localStorage.getItem('yooz_admin_token');
  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return res.json();
}
