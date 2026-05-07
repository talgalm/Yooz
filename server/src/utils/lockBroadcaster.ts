import type { Response } from 'express';

/**
 * Per-activity SSE broadcaster for the manager-controlled progress lock.
 * Keeps an in-memory map of activityCode -> connected Express response objects
 * (one per participant tab). When the manager changes the lock state we push
 * an event to every subscriber.
 *
 * In-memory only — fine because the lock state is also persisted on the
 * Activity document, so a server restart simply makes clients re-subscribe and
 * fetch the current state on connect.
 */

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
      // ignore — client likely disconnected; cleanup happens on the close handler
    }
  }
}

export function sendLockEvent(res: Response, lockedFromIndex: number | null): void {
  const payload = JSON.stringify({ lockedFromIndex });
  res.write(`event: lock\ndata: ${payload}\n\n`);
}
