import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';
import { MAX_USABLE_ACCURACY_M, type Fix } from '../utils/geo';
import type { MapGroupMarker, MapRunState } from '../pages/StoryModulePage/types';

/** How often each member re-reads the shared run and the other teams' markers. */
const POLL_MS = 10_000;
/** Positions are pushed no faster than this, however often GPS fires. */
const PUSH_MS = 8_000;

interface MapRun {
  /** The device's own latest usable GPS fix. Null until the first one lands. */
  fix: Fix | null;
  /** Set when the browser refuses or has no GPS — the UI has to say so. */
  geoError: string | null;
  run: MapRunState | null;
  others: MapGroupMarker[];
  /** Records a completed station for the whole group and refreshes state. */
  complete: (itemIndex: number, score: number) => Promise<MapRunState | null>;
  refresh: () => void;
}

/**
 * Drives one participant's half of a map activity: watch GPS, push this
 * device's position (the server decides whether it's the one broadcasting for
 * the team), and poll the group's shared progress.
 *
 * Polling rather than SSE on purpose — a marker that is 10s stale is fine for
 * people on foot, and this is a fraction of the code a stream would need.
 */
export function useMapRun(code: string, enabled: boolean): MapRun {
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [run, setRun] = useState<MapRunState | null>(null);
  const [others, setOthers] = useState<MapGroupMarker[]>([]);
  const lastPush = useRef(0);
  const latestFix = useRef<Fix | null>(null);

  // ─ GPS watch. Same options the AR demo settled on: anything less accurate
  //   than high-accuracy GPS is useless at station-opening distances.
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setGeoError('unsupported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const next: Fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 999,
        };
        latestFix.current = next;
        // Keep junk fixes out of the UI entirely — a ±400m reading would send
        // the "you are 380m away" readout jumping for no reason.
        if (next.accuracy <= MAX_USABLE_ACCURACY_M) setFix(next);
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    apiFetch<{ me: MapRunState; groups: MapGroupMarker[] }>(`/api/activities/${code}/map/state`)
      .then((d) => {
        setRun(d.me);
        setOthers(d.groups || []);
      })
      .catch(() => { /* a dropped poll is replaced by the next one */ });
  }, [code, enabled]);

  // ─ Poll shared state, and push our own position at most every PUSH_MS.
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = setInterval(() => {
      refresh();
      const current = latestFix.current;
      if (!current || current.accuracy > MAX_USABLE_ACCURACY_M) return;
      if (Date.now() - lastPush.current < PUSH_MS) return;
      lastPush.current = Date.now();
      apiFetch(`/api/activities/${code}/map/position`, {
        method: 'POST',
        body: JSON.stringify({ lat: current.lat, lng: current.lng }),
      }).catch(() => { /* position is best-effort; the next tick retries */ });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [code, enabled, refresh]);

  const complete = useCallback(
    async (itemIndex: number, score: number) => {
      try {
        const next = await apiFetch<MapRunState>(`/api/activities/${code}/map/complete`, {
          method: 'POST',
          body: JSON.stringify({ itemIndex, score }),
        });
        setRun(next);
        return next;
      } catch {
        return null;
      }
    },
    [code],
  );

  return { fix, geoError, run, others, complete, refresh };
}
