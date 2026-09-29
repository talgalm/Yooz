export const MAP_STYLE_IDS = [
  'standard',
  'light',
  'dark',
  'night',
  'satellite',
  'vintage',
  'wildWest',
  'treasure',
  'playful',
  'blueprint',
] as const;

export const MAP_FEATURE_KEYS = [
  'business',
  'park',
  'attraction',
  'worship',
  'school',
  'medical',
  'government',
  'sports',
  'bus',
  'railAndAir',
  'streetNames',
  'placeNames',
] as const;

export type MapStyleId = (typeof MAP_STYLE_IDS)[number];
export type MapFeatureKey = (typeof MAP_FEATURE_KEYS)[number];

export interface IMapDesign {
  style: MapStyleId;
  hidden: MapFeatureKey[];
}

function isMapStyleId(value: unknown): value is MapStyleId {
  return typeof value === 'string' && (MAP_STYLE_IDS as readonly string[]).includes(value);
}

function isMapFeatureKey(value: unknown): value is MapFeatureKey {
  return typeof value === 'string' && (MAP_FEATURE_KEYS as readonly string[]).includes(value);
}

export function sanitizeMapDesign(raw: unknown): IMapDesign | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const { style, hidden } = raw as Record<string, unknown>;
  const cleanStyle = isMapStyleId(style) ? style : 'standard';
  const cleanHidden = Array.isArray(hidden)
    ? MAP_FEATURE_KEYS.filter((key) => hidden.some((h) => isMapFeatureKey(h) && h === key))
    : [];
  if (cleanStyle === 'standard' && cleanHidden.length === 0) return undefined;
  return { style: cleanStyle, hidden: cleanHidden };
}

const MAP_ICON_URL_MAX_LENGTH = 1000;

export function sanitizeMapIcon(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const url = raw.trim();
  if (!url || url.length > MAP_ICON_URL_MAX_LENGTH) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}
