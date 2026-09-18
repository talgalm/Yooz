// Small spherical-earth helpers for the AR demo. Flat-earth approximations are
// fine here: the distances involved are tens of meters, not kilometers.
const R = 6371000; // earth radius, meters
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Compass bearing from a to b, degrees clockwise from north (0..360). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Signed smallest angle from `from` to `to`, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Point `north`/`east` meters away from origin. */
export function offsetMeters(origin: LatLng, north: number, east: number): LatLng {
  return {
    lat: origin.lat + toDeg(north / R),
    lng: origin.lng + toDeg(east / (R * Math.cos(toRad(origin.lat)))),
  };
}

// ─── Arrival detection (map modules) ───────────────────────────────────────

/** Trigger radius when the activity doesn't set one. */
export const DEFAULT_PROXIMITY_METERS = 10;
/** Fixes worse than this are wifi/cell-tower guesses, not GPS — ignore them. */
export const MAX_USABLE_ACCURACY_M = 50;
/** Cap on how much reported accuracy we'll forgive, so one bad fix can't put
 *  the participant "at" every station at once. */
const MAX_FORGIVEN_ACCURACY_M = 25;
/** Arrived at `radius`, still arrived until `radius * this` — stops the marker
 *  strobing as the fix jitters across the boundary. */
const LEAVE_HYSTERESIS = 2.5;

export interface Fix extends LatLng {
  /** Browser-reported 68%-confidence radius, meters (`coords.accuracy`). */
  accuracy: number;
}

/**
 * Distance to `target` minus the fix's own error envelope, floored at 0.
 *
 * This is the whole trick behind a workable 10m radius: a phone standing at the
 * sign routinely reads 12m out with ±15m accuracy, and comparing raw distance
 * against the radius leaves that participant stuck. Comparing the optimistic
 * edge of the error circle agrees with the person who can see the station.
 */
export function effectiveDistance(from: Fix, target: LatLng): number {
  const forgiven = Math.min(Math.max(from.accuracy, 0), MAX_FORGIVEN_ACCURACY_M);
  return Math.max(0, distanceMeters(from, target) - forgiven);
}

/**
 * Whether the participant counts as standing at `target`.
 *
 * `wasArrived` applies the exit hysteresis: pass the previous result in so a
 * jittering fix doesn't flip the station open and shut.
 */
export function hasArrived(
  from: Fix,
  target: LatLng,
  radius = DEFAULT_PROXIMITY_METERS,
  wasArrived = false,
): boolean {
  if (from.accuracy > MAX_USABLE_ACCURACY_M) return wasArrived; // junk fix: hold
  return effectiveDistance(from, target) <= (wasArrived ? radius * LEAVE_HYSTERESIS : radius);
}
