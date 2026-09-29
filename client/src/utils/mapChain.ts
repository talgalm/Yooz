import { distanceMeters, type LatLng } from './geo';

export const SAME_PLACE_M = 15;

interface Placed<L extends LatLng = LatLng> {
  location?: L;
}

export function placeOf<L extends LatLng>(items: Placed<L>[], index: number): L | undefined {
  for (let i = index; i >= 0; i--) {
    const location = items[i]?.location;
    if (location) return location;
  }
  return undefined;
}

export function opensRightAfter(items: Placed[], index: number): boolean {
  if (index <= 0 || index >= items.length) return false;
  const own = items[index].location;
  if (!own) return true;
  const before = placeOf(items, index - 1);
  return !!before && distanceMeters(before, own) <= SAME_PLACE_M;
}

export function placeGroupEnd(items: Placed[], start: number): number {
  let end = start;
  while (end + 1 < items.length && opensRightAfter(items, end + 1)) end += 1;
  return end;
}
