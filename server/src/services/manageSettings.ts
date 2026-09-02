import { Settings, ISettings } from '../models/manage/Settings';

/**
 * Settings loader with a small in-process cache.
 *
 * Every hour validation, every health recalculation and every alert sweep needs
 * these values, so an uncached read would put a database round-trip in front of
 * work that already runs in loops. The cache is invalidated on write, and the
 * TTL is a backstop for the multi-process case rather than the main mechanism.
 */
let cached: ISettings | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/** Creates the document on first call, so there is no separate seed step. */
export async function getSettings(): Promise<ISettings> {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  const doc = await Settings.findOneAndUpdate(
    { singleton: 'settings' },
    { $setOnInsert: { singleton: 'settings' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  cached = doc as ISettings;
  cachedAt = Date.now();
  return cached;
}

export function invalidateSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}

/** Categories that must name a project, straight from settings. */
export async function categoriesRequiringProject(): Promise<string[]> {
  const s = await getSettings();
  return s.timeCategories.filter((c) => c.requiresProject).map((c) => c.key);
}
