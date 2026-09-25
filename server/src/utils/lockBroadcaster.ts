import type { Response } from 'express';

const subscribers = new Map<string, Set<Response>>();

export function subscribe(activityCode: string, res: Response): () => void {
  let set = subscribers.get(activityCode);
  if (!set) {
    set = new Set();
    subscribers.set(activityCode, set);
  }
  set.add(res);

  return () => {
    const s = subscribers.get(activityCode);
    if (!s) return;
    s.delete(res);
    if (s.size === 0) subscribers.delete(activityCode);
  };
}

export function broadcastLock(activityCode: string, lockedFromIndex: number | null): void {
  const set = subscribers.get(activityCode);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify({ lockedFromIndex });
  for (const res of set) {
    try {
      res.write(`event: lock\ndata: ${payload}\n\n`);
    } catch {
    }
  }
}

export function sendLockEvent(res: Response, lockedFromIndex: number | null): void {
  const payload = JSON.stringify({ lockedFromIndex });
  res.write(`event: lock\ndata: ${payload}\n\n`);
}
