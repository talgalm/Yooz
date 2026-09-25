import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';
import { MAX_USABLE_ACCURACY_M, type Fix } from '../utils/geo';
import type { MapGroupMarker, MapRunState } from '../pages/StoryModulePage/types';

const POLL_MS = 10_000;
const PUSH_MS = 8_000;

interface MapRun {
  fix: Fix | null;
  geoError: string | null;
  run: MapRunState | null;
  others: MapGroupMarker[];
  complete: (itemIndex: number, score: number) => Promise<MapRunState | null>;
  refresh: () => void;
}

export function useMapRun(code: string, enabled: boolean, team: boolean): MapRun {
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [run, setRun] = useState<MapRunState | null>(null);
  const [others, setOthers] = useState<MapGroupMarker[]>([]);
  const lastPush = useRef(0);
  const latestFix = useRef<Fix | null>(null);

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
        if (next.accuracy <= MAX_USABLE_ACCURACY_M) setFix(next);
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  const refresh = useCallback(() => {
    if (!team) return;
    apiFetch<{ me: MapRunState; groups: MapGroupMarker[] }>(`/api/activities/${code}/map/state`)
      .then((d) => {
        setRun(d.me);
        setOthers(d.groups || []);
      })
      .catch(() => { });
  }, [code, team]);

  useEffect(() => {
    if (!team) return;
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
      }).catch(() => { });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [code, team, refresh]);

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
        refresh();
        return null;
      }
    },
    [code, refresh],
  );

  return { fix, geoError, run, others, complete, refresh };
}
