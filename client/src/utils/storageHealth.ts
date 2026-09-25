
let healthy = true;

function probe(): boolean {
  try {
    const key = '__yooz_storage_probe__';
    localStorage.setItem(key, '1');
    if (localStorage.getItem(key) !== '1') return false;
    localStorage.removeItem(key);
    sessionStorage.setItem(key, '1');
    if (sessionStorage.getItem(key) !== '1') return false;
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') healthy = probe();

export function isStorageHealthy(): boolean {
  return healthy;
}
