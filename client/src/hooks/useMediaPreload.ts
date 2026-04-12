import { useState, useRef, useEffect } from 'react';

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('/video/upload/');
}

/**
 * Returns true once all provided media URLs have finished loading (or errored / timed out).
 * An empty url list resolves immediately.
 * URLs are captured on mount — changing the array after mount has no effect.
 */
export function useMediaPreload(urls: (string | undefined | null)[]): boolean {
  const urlsRef = useRef<string[]>(urls.filter((u): u is string => Boolean(u)));
  const [ready, setReady] = useState(urlsRef.current.length === 0);

  useEffect(() => {
    const filtered = urlsRef.current;
    if (filtered.length === 0) {
      setReady(true);
      return;
    }

    let remaining = filtered.length;
    let cancelled = false;

    const done = () => {
      if (cancelled) return;
      remaining -= 1;
      if (remaining === 0) setReady(true);
    };

    for (const url of filtered) {
      if (isVideoUrl(url)) {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = done;
        vid.onerror = done;
        vid.src = url;
      } else {
        const img = new Image();
        img.onload = done;
        img.onerror = done;
        img.src = url;
      }
    }

    // Safety: never block the UI forever
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ready;
}
