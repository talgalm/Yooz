import type { HydratedDocument } from 'mongoose';
import { Activity, ActivityGroup, Report, type IActivity } from '../models';
import { israelDayString } from '../utils/israelTime';

/**
 * Wipe every participant-produced trace of an activity: reports, groups,
 * session state and analytics counters. Mutates the doc — the caller saves.
 * Shared by the go-live toggle and the daily reset sweep.
 */
export async function wipeActivityData(activity: HydratedDocument<IActivity>): Promise<void> {
  await Report.deleteMany({ activityId: activity._id });
  await ActivityGroup.deleteMany({ activityId: activity._id });
  activity.orderSurveySession = undefined;
  activity.shareClicks = undefined;
  activity.shareCompleted = undefined;
  activity.missionPuzzleCompletions = undefined;
  activity.missionTrashSortCompletions = undefined;
  activity.missionTrashSortScoreSum = undefined;
}

/**
 * Whether a `dailyReset` activity is due for a wipe. An activity with no stamp
 * yet is only armed, never wiped — the sweep that runs seconds after the
 * checkbox is ticked must not eat the data of the day it was ticked on.
 */
export function isDailyResetDue(lastDailyResetDay: string | undefined, today: string): boolean {
  return Boolean(lastDailyResetDay) && lastDailyResetDay !== today;
}

/** Wipe every `dailyReset` activity whose stamped Israel day is no longer today. */
export async function runDailyResets(): Promise<number> {
  const today = israelDayString();
  let wiped = 0;

  for (const activity of await Activity.find({ dailyReset: true })) {
    if (activity.lastDailyResetDay === today) continue;
    try {
      if (isDailyResetDue(activity.lastDailyResetDay, today)) {
        await wipeActivityData(activity);
        wiped++;
      }
      activity.lastDailyResetDay = today;
      await activity.save();
    } catch (err) {
      console.error('[dailyReset] failed for activity', activity.code, err);
    }
  }
  if (wiped > 0) console.log(`[dailyReset] wiped ${wiped} activity/activities for ${today}`);
  return wiped;
}

/** Poll every 5 min: reset lands within 5 minutes of Israel midnight. */
export function startDailyResetScheduler(): void {
  const run = () => runDailyResets().catch((err) => console.error('[dailyReset] sweep crashed', err));
  setInterval(run, 5 * 60_000);
  run();
}
