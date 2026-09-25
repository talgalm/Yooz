import { Settings, ISettings } from '../models/manage/Settings';

let cached: ISettings | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

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

export async function categoriesRequiringProject(): Promise<string[]> {
  const s = await getSettings();
  return s.timeCategories.filter((c) => c.requiresProject).map((c) => c.key);
}
