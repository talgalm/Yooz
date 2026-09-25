const cache = new Map<string, unknown>();
const MODULE_STORAGE_PREFIX = 'yooz_module_v2_';

function cacheKey(code: string, group: string): string {
  let lang = 'he';
  try {
    lang = localStorage.getItem('yooz_lang') || 'he';
  } catch {
  }
  return `${code.trim()}:${group || ''}:${lang}`;
}

function persistKey(code: string, group: string): string {
  return `${MODULE_STORAGE_PREFIX}${cacheKey(code, group)}`;
}

export function setCachedModuleData(code: string, group: string, data: unknown): void {
  const key = cacheKey(code, group);
  cache.set(key, data);
  try {
    sessionStorage.setItem(persistKey(code, group), JSON.stringify(data));
  } catch {
    /* module JSON too large for sessionStorage */
  }
}

export function getCachedModuleData<T = unknown>(code: string, group: string): T | null {
  const key = cacheKey(code, group);
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;

  try {
    const raw = sessionStorage.getItem(persistKey(code, group));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedModuleData(code?: string): void {
  if (!code) {
    cache.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(MODULE_STORAGE_PREFIX)) sessionStorage.removeItem(key);
      }
    } catch {
      /* noop */
    }
    return;
  }

  const prefix = `${code.trim()}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }

  try {
    const storagePrefix = `${MODULE_STORAGE_PREFIX}${prefix}`;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(storagePrefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* noop */
  }
}
