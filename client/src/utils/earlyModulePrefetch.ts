import { apiFetchWithRetry } from './api';
import { getCachedModuleData, setCachedModuleData } from './moduleCache';
import { optimizeActivityMediaData } from './participantMedia';
import { preloadActivityMedia } from './mediaPreloader';
import type { ActivityModuleResponse } from '../pages/StoryModulePage/types';

export async function prefetchActivityModule(code: string, group = ''): Promise<ActivityModuleResponse | null> {
  const cached = getCachedModuleData<ActivityModuleResponse>(code, group);
  if (cached) {
    preloadActivityMedia(cached);
    return cached;
  }

  const data = await apiFetchWithRetry<ActivityModuleResponse>(
    `/api/activities/${encodeURIComponent(code)}/module?group=${encodeURIComponent(group)}`,
    { headers: { 'Cache-Control': 'no-store' } },
    6,
  );
  const optimized = optimizeActivityMediaData(data);
  setCachedModuleData(code, group, optimized);
  preloadActivityMedia(optimized);
  return optimized;
}

export function startEarlyModulePrefetch(code: string, group = ''): void {
  void prefetchActivityModule(code, group).catch(() => {});
}
