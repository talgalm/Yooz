import { useEffect, useState } from 'react';

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
      }
    };

    es.addEventListener('lock', onLock);
    return () => {
      es.removeEventListener('lock', onLock);
      es.close();
    };
  }, [code]);

  return lockedFromIndex;
}
