import type { IItemLocation } from '../models';

/**
 * What the admin sends per module item, before it is trusted. Every field is
 * optional and unknown - this is a request body, not a document.
 */
interface RawItem {
  type?: unknown;
  ref?: unknown;
  groups?: unknown;
  spiderSvg?: unknown;
  isFinal?: unknown;
  revisitable?: unknown;
  collageSplit?: unknown;
  location?: unknown;
}

/** The stored shape. `ref` stays a string here; Mongoose casts it on save. */
export interface SanitisedItem {
  type: string;
  ref: string;
  groups?: string[];
  spiderSvg?: string;
  isFinal?: true;
  revisitable?: true;
  collageSplit?: unknown;
  location?: IItemLocation;
}

const ITEM_TYPES = ['game', 'station', 'mission'];

/**
 * A pin counts only when both numbers are real. A half-filled location - lat
 * typed, lng still empty - is no location, and storing it would put a station
 * on Null Island rather than leave it visibly unplaced in the admin.
 */
export function readItemLocation(raw: unknown): IItemLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { lat, lng, address } = raw as { lat?: unknown; lng?: unknown; address?: unknown };
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;

  const trimmed = typeof address === 'string' ? address.trim() : '';
  return { lat, lng, ...(trimmed && { address: trimmed }) };
}

/**
 * The module items as they are stored: the request's own fields are never
 * spread in wholesale, so a payload cannot smuggle extra keys onto an item.
 * Every field a module item is allowed to carry has to be listed here - the
 * map `location` was missing for a while, which silently dropped every pin an
 * admin placed and left the activity looking like it had no stations at all.
 */
export function sanitiseModuleItems(raw: unknown): SanitisedItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item: RawItem) => item && item.type && item.ref && ITEM_TYPES.includes(item.type as string))
    .map((item: RawItem) => {
      const location = readItemLocation(item.location);
      return {
        type: item.type as string,
        ref: String(item.ref),
        ...(Array.isArray(item.groups) && item.groups.length > 0 && { groups: item.groups as string[] }),
        ...(typeof item.spiderSvg === 'string' && item.spiderSvg ? { spiderSvg: item.spiderSvg } : {}),
        ...(item.isFinal === true && { isFinal: true as const }),
        ...(item.revisitable === true && { revisitable: true as const }),
        ...(item.collageSplit && typeof item.collageSplit === 'object' ? { collageSplit: item.collageSplit } : {}),
        ...(location && { location }),
      };
    });
}

/**
 * The two map-only module fields. Both are dropped for other module types, so
 * switching a module away from `map` does not leave a stale walking order
 * behind that would come back if it were switched to `map` again.
 */
export function sanitiseMapFields(
  moduleType: string,
  raw: { groupOrders?: unknown; proximityMeters?: unknown },
): { groupOrders?: Record<string, number[]>; proximityMeters?: number } {
  if (moduleType !== 'map') return {};

  const out: { groupOrders?: Record<string, number[]>; proximityMeters?: number } = {};

  if (raw.groupOrders && typeof raw.groupOrders === 'object' && !Array.isArray(raw.groupOrders)) {
    const orders: Record<string, number[]> = {};
    for (const [group, order] of Object.entries(raw.groupOrders as Record<string, unknown>)) {
      if (!Array.isArray(order)) continue;
      const indices = order.filter((i): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0);
      if (indices.length > 0) orders[group] = indices;
    }
    if (Object.keys(orders).length > 0) out.groupOrders = orders;
  }

  const meters = raw.proximityMeters;
  if (typeof meters === 'number' && Number.isFinite(meters) && meters > 0) {
    /** A radius past a kilometre is a typo, not a walk. */
    out.proximityMeters = Math.min(Math.round(meters), 1000);
  }

  return out;
}
