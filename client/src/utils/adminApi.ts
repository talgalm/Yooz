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
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

// Upload a file via multipart/form-data (no Content-Type header — browser sets it with boundary)
export async function adminUploadFile(file: File): Promise<{ url: string; publicId: string; resourceType: string }> {
  const token = localStorage.getItem('yooz_admin_token');
  const formData = new FormData();
  formData.append('file', file);

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
