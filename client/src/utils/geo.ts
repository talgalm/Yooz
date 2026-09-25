const R = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function offsetMeters(origin: LatLng, north: number, east: number): LatLng {
  return {
    lat: origin.lat + toDeg(north / R),
    lng: origin.lng + toDeg(east / (R * Math.cos(toRad(origin.lat)))),
  };
}

export const DEFAULT_PROXIMITY_METERS = 10;
export const MAX_USABLE_ACCURACY_M = 50;
const MAX_FORGIVEN_ACCURACY_M = 25;
const LEAVE_HYSTERESIS = 2.5;

export interface Fix extends LatLng {
  accuracy: number;
}

export function effectiveDistance(from: Fix, target: LatLng): number {
  const forgiven = Math.min(Math.max(from.accuracy, 0), MAX_FORGIVEN_ACCURACY_M);
  return Math.max(0, distanceMeters(from, target) - forgiven);
}

export function hasArrived(
  from: Fix,
  target: LatLng,
  radius = DEFAULT_PROXIMITY_METERS,
  wasArrived = false,
): boolean {
  if (from.accuracy > MAX_USABLE_ACCURACY_M) return wasArrived;
  return effectiveDistance(from, target) <= (wasArrived ? radius * LEAVE_HYSTERESIS : radius);
}
