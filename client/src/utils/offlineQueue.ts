import { HttpError, isRetryableFetchError, retryDelayMs } from './fetchErrors';

const STORAGE_KEY = 'yooz_offline_queue';
const MAX_QUEUE = 30;

type QueuedWrite = {
  url: string;
  method: string;
  body: string;
  queuedAt: number;
};

const queueListeners = new Set<() => void>();

function notifyQueueListeners(): void {
  for (const cb of queueListeners) cb();
}

function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PATCH' || m === 'PUT' || m === 'DELETE';
}

function normalizeUrl(url: string): string {
  return url.replace(/\?.*$/, '');
}

function isScoresPost(url: string, method: string): boolean {
  return method === 'POST' && /\/scores$/.test(normalizeUrl(url));
}

function readQueue(): QueuedWrite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedWrite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedWrite[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* storage full */
  }
}

async function sendQueuedRequest(item: QueuedWrite): Promise<void> {
  const token = localStorage.getItem('yooz_token');
  let lastError: unknown;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: item.body,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new HttpError(error.error || 'Request failed', res.status);
      }
      return;
    } catch (err) {
      lastError = err;
      if (!isRetryableFetchError(err) || attempt >= 5) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
    }
  }

  throw lastError;
}

/**
 * Queue a failed write. Progress PATCHes are appended in order so every
 * completed station is replayed. Scores POSTs dedupe by URL (latest wins).
 */
export function enqueueOfflineRequest(url: string, options: RequestInit = {}): void {
  const method = (options.method || 'GET').toUpperCase();
  if (!isWriteMethod(method)) return;
  const body = typeof options.body === 'string' ? options.body : '';

  let queue = readQueue();
  if (isScoresPost(url, method)) {
    queue = queue.filter((q) => !(q.url === url && q.method === method));
  }

  queue.push({ url, method, body, queuedAt: Date.now() });
  writeQueue(queue);
  notifyQueueListeners();
}

export function isRequestQueued(url: string, method = 'POST'): boolean {
  const m = method.toUpperCase();
  return readQueue().some((q) => q.url === url && q.method === m);
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

let flushing = false;
let listenersReady = false;

export async function flushOfflineQueue(): Promise<void> {
  if (flushing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const queue = readQueue();
  if (!queue.length) return;

  flushing = true;
  const remaining: QueuedWrite[] = [];
  try {
    for (const item of queue) {
      try {
        await sendQueuedRequest(item);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    notifyQueueListeners();
  } finally {
    flushing = false;
  }
}

export function ensureOfflineQueueListeners(): void {
  if (listenersReady || typeof window === 'undefined') return;
  listenersReady = true;

  const tick = () => {
    if (navigator.onLine) void flushOfflineQueue();
  };

  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
  setInterval(tick, 20_000);
}

export { isRetryableFetchError } from './fetchErrors';
