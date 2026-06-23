const STORAGE_KEY = 'yooz_offline_queue';
const MAX_QUEUE = 30;

type QueuedWrite = {
  url: string;
  method: string;
  body: string;
  queuedAt: number;
};

function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PATCH' || m === 'PUT' || m === 'DELETE';
}

function isRetryableFetchError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return false;
  return err instanceof TypeError;
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
    throw new Error(error.error || 'Request failed');
  }
}

/** Queue a failed write; latest body per URL wins (progress/scores supersede older). */
export function enqueueOfflineRequest(url: string, options: RequestInit = {}): void {
  const method = (options.method || 'GET').toUpperCase();
  if (!isWriteMethod(method)) return;
  const body = typeof options.body === 'string' ? options.body : '';
  const queue = readQueue().filter((q) => q.url !== url);
  queue.push({ url, method, body, queuedAt: Date.now() });
  writeQueue(queue);
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
      } catch (err) {
        remaining.push(item);
        void err;
      }
    }
    writeQueue(remaining);
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

export { isRetryableFetchError };
