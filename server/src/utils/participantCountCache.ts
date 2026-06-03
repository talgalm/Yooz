import { Types } from 'mongoose';
import { Report } from '../models';

const TTL_MS = 45_000;
const cache = new Map<string, { count: number; expiresAt: number }>();

export async function getParticipantCount(activityId: Types.ObjectId | string): Promise<number> {
  const key = activityId.toString();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.count;
  }
  const count = await Report.countDocuments({ activityId });
  cache.set(key, { count, expiresAt: Date.now() + TTL_MS });
  return count;
}

/** Call when a new report is created so popup thresholds stay reasonably fresh. */
export function bumpParticipantCount(activityId: Types.ObjectId | string): void {
  const key = activityId.toString();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    hit.count += 1;
  } else {
    cache.delete(key);
  }
}
