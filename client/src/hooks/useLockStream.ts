import { useEffect, useState } from 'react';

/**
 * Subscribes to the activity's lock-state SSE stream.
 *
 * The server emits `event: lock` with `{ lockedFromIndex: number | null }`.
 * EventSource auto-reconnects on transient failures, so we only handle the
 * "received an event" path. On unmount or when the activity code changes,
 * the connection is closed.
 *
 * @param code  Activity code (URL param). Pass undefined/empty to disable.
 * @param initial  The lock state from the initial module fetch (optional).
 */
export function useLockStream(code: string | undefined, initial: number | null = null): number | null {
  const [lockedFromIndex, setLockedFromIndex] = useState<number | null>(initial);

  useEffect(() => {
    if (!code) return;
    setLockedFromIndex(initial);

    const url = `/api/activities/${encodeURIComponent(code)}/lock-stream`;
    const es = new EventSource(url);

    const onLock = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as { lockedFromIndex: number | null };
        setLockedFromIndex(typeof data.lockedFromIndex === 'number' ? data.lockedFromIndex : null);
      } catch {
        // ignore malformed payloads
      }
    };

    es.addEventListener('lock', onLock);
    return () => {
      es.removeEventListener('lock', onLock);
      es.close();
    };
    // We intentionally exclude `initial` from deps — it's only used to seed state on (re)connect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return lockedFromIndex;
}
