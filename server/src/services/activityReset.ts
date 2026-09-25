import type { HydratedDocument } from 'mongoose';
import { Activity, ActivityGroup, MapGroupState, Report, type IActivity } from '../models';
import { israelDayString } from '../utils/israelTime';

export async function wipeActivityData(activity: HydratedDocument<IActivity>): Promise<void> {
  await Report.deleteMany({ activityId: activity._id });
  await ActivityGroup.deleteMany({ activityId: activity._id });
  await MapGroupState.deleteMany({ activityId: activity._id });
  activity.orderSurveySession = undefined;
  activity.shareClicks = undefined;
  activity.shareCompleted = undefined;
  activity.missionPuzzleCompletions = undefined;
  activity.missionTrashSortCompletions = undefined;
  activity.missionTrashSortScoreSum = undefined;
}

export async function rollOverActivityDay(activity: HydratedDocument<IActivity>): Promise<void> {
  await ActivityGroup.deleteMany({ activityId: activity._id });
  activity.orderSurveySession = undefined;
}

export function isDailyResetDue(lastDailyResetDay: string | undefined, today: string): boolean {
  return Boolean(lastDailyResetDay) && lastDailyResetDay !== today;
}

export async function runDailyResets(): Promise<number> {
  const today = israelDayString();
  let rolled = 0;

  for (const activity of await Activity.find({ dailyReset: true })) {
    if (activity.lastDailyResetDay === today) continue;
    try {
      if (isDailyResetDue(activity.lastDailyResetDay, today)) {
        await rollOverActivityDay(activity);
        rolled++;
      }
      activity.lastDailyResetDay = today;
      await activity.save();
    } catch (err) {
      console.error('[dailyReset] failed for activity', activity.code, err);
    }
  }
  if (rolled > 0) console.log(`[dailyReset] rolled over ${rolled} activity/activities for ${today}`);
  return rolled;
}

export function startDailyResetScheduler(): void {
  const run = () => runDailyResets().catch((err) => console.error('[dailyReset] sweep crashed', err));
  setInterval(run, 5 * 60_000);
  run();
}
