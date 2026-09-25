import type { LatLng } from './geo';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
const SCRIPT_ID = 'yz-google-maps';
const CALLBACK = '__yzMapsReady';
const AUTH_FAILURE_EVENT = 'yz-maps-auth-failure';

let authFailed = false;
(window as unknown as Record<string, () => void>).gm_authFailure = () => {
  authFailed = true;
  window.dispatchEvent(new Event(AUTH_FAILURE_EVENT));
};

export function isMapsAvailable(): boolean {
  return !!API_KEY;
}

export function onMapsAuthFailure(handler: () => void): () => void {
  if (authFailed) handler();
  window.addEventListener(AUTH_FAILURE_EVENT, handler);
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, handler);
}

let loading: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!API_KEY) return Promise.reject(new Error('maps_key_missing'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}` +
      `&loading=async&callback=${CALLBACK}`;
    (window as unknown as Record<string, () => void>)[CALLBACK] = () => {
      const maps = window.google?.maps;
      if (!maps?.importLibrary) {
        reject(new Error('maps_load_failed'));
        return;
      }
      Promise.all([
        maps.importLibrary('maps'),
        maps.importLibrary('marker'),
        maps.importLibrary('geocoding'),
        maps.importLibrary('routes'),
      ])
        .then(() => resolve(maps))
        .catch(() => reject(new Error('maps_load_failed')));
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('maps_load_failed'));
    };
    if (!existing) document.head.appendChild(script);
  });
  return loading;
}

export async function geocodeAddress(address: string): Promise<(LatLng & { address: string }) | null> {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  try {
    const { results } = await geocoder.geocode({ address });
    const best = results?.[0];
    if (!best) return null;
    return {
      lat: best.geometry.location.lat(),
      lng: best.geometry.location.lng(),
      address: best.formatted_address || address,
    };
  } catch {
    return null;
  }
}
