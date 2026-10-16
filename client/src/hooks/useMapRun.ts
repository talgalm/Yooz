import { useEffect, useState } from 'react';
import { MAX_USABLE_ACCURACY_M, type Fix } from '../utils/geo';

interface MapRun {
  fix: Fix | null;
  geoError: string | null;
}

export function useMapRun(enabled: boolean): MapRun {
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        };
        if (next.accuracy <= MAX_USABLE_ACCURACY_M) setFix(next);
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { fix, geoError };
}
