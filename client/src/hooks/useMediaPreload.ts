import { useState, useRef, useEffect, useCallback } from 'react';
import {
  isVideoMediaUrl,
  loadParticipantImage,
  loadParticipantVideo,
} from '../utils/participantMedia';

export interface MediaPreloadState {
  ready: boolean;
  failed: boolean;
  retry: () => void;
}

/**
 * Waits until all provided media URLs have loaded. Retries on error and shows
 * a failed state so the UI can offer a retry. A per-media watchdog (see
 * participantMedia) resolves as ready if the browser never fires load/error —
 * e.g. iOS Safari deferring an off-DOM <video> — so the UI can't hang forever.
 * URLs are captured on mount — changing the array after mount has no effect.
 */
export function useMediaPreload(urls: (string | undefined | null)[]): MediaPreloadState {
  const urlsRef = useRef<string[]>(urls.filter((u): u is string => Boolean(u)));
  const [ready, setReady] = useState(urlsRef.current.length === 0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setReady(false);
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const filtered = urlsRef.current;
    if (filtered.length === 0) {
      setReady(true);
      setFailed(false);
      return;
    }

    let loaded = 0;
    let anyFailed = false;
    let cancelled = false;
    const total = filtered.length;
    const cleanups: Array<() => void> = [];

    const checkDone = () => {
      if (cancelled || loaded < total) return;
      if (anyFailed) {
        setReady(false);
        setFailed(true);
      } else {
        setReady(true);
        setFailed(false);
      }
    };

    const done = () => {
      if (cancelled) return;
      loaded += 1;
      checkDone();
    };

    const fail = () => {
      if (cancelled) return;
      anyFailed = true;
      loaded += 1;
      checkDone();
    };

    for (const url of filtered) {
      if (isVideoMediaUrl(url)) {
        cleanups.push(loadParticipantVideo(url, done, fail));
      } else {
        cleanups.push(loadParticipantImage(url, done, fail));
      }
    }

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [attempt]);

  return { ready, failed, retry };
}
