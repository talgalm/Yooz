/**
 * Google Maps JS API loader.
 *
 * Deliberately a script tag and a cached promise rather than an npm wrapper:
 * the API already ships the map, the geocoder and walking directions, and a
 * React binding would only add a dependency on top of the same global.
 */
import type { LatLng } from './geo';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
const SCRIPT_ID = 'yz-google-maps';

export function isMapsAvailable(): boolean {
  return !!API_KEY;
}

let loading: Promise<typeof google.maps> | null = null;

/** Loads the API once per page; every caller shares the same promise. */
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
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async`;
    script.onload = () => {
      const maps = window.google?.maps;
      if (!maps) {
        reject(new Error('maps_load_failed'));
        return;
      }
      // Under `loading=async` the bootstrap resolves before the individual
      // libraries are attached, so `new maps.Geocoder()` at this point throws
      // "not a constructor". Awaiting them puts the classes on the namespace
      // (importLibrary attaches them for compatibility), so every call site can
      // keep using `new maps.X` instead of threading library handles around.
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
      // Let a later attempt retry instead of caching the failure forever.
      loading = null;
      script.remove();
      reject(new Error('maps_load_failed'));
    };
    if (!existing) document.head.appendChild(script);
  });
  return loading;
}

/** Address -> coordinates, for the admin station editor. Null when not found. */
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
    return null; // ZERO_RESULTS rejects rather than returning an empty list
  }
}
