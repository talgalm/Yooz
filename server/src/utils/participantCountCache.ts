import { Types } from 'mongoose';
import { Report } from '../models';
import { startOfTodayIsrael } from './israelTime';

const TTL_MS = 45_000;
const cache = new Map<string, { count: number; expiresAt: number }>();

const cacheKey = (activityId: Types.ObjectId | string, dayScoped: boolean) =>
  `${activityId.toString()}${dayScoped ? ':today' : ''}`;

/**
 * `dayScoped` counts only today's joins — used by `dailyReset` activities,
 * whose reports now outlive the day, so an all-time count would make a
 * participant-count popup threshold fire on the first join every morning.
 */
export async function getParticipantCount(
  activityId: Types.ObjectId | string,
  dayScoped = false,
): Promise<number> {
  const key = cacheKey(activityId, dayScoped);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.count;
  }
  const count = await Report.countDocuments({
    activityId,
    ...(dayScoped && { joinedAt: { $gte: startOfTodayIsrael() } }),
  });
  cache.set(key, { count, expiresAt: Date.now() + TTL_MS });
  return count;
}

/** Call when a new report is created so popup thresholds stay reasonably fresh. */
export function bumpParticipantCount(activityId: Types.ObjectId | string): void {
  cache.delete(cacheKey(activityId, false));
  cache.delete(cacheKey(activityId, true));
}
