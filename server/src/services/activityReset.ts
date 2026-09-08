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
 * Start a fresh day for a `dailyReset` activity: participants see an empty
 * board, but nothing is destroyed.
 *
 * Reports and the analytics counters survive on purpose — they are the report
 * history, and the admin screens slice them per day. Only what would leak
 * yesterday into today's *participant* experience is cleared: group rosters
 * (so a group re-forms each morning) and the live presenter session.
 *
 * Day scoping of the participant views is enforced at read time, not here — see the
 * login lookup in `participantAuth`, `currentDayOnly` in the leaderboard route, and
 * `getParticipantCount`.
 */
export async function rollOverActivityDay(activity: HydratedDocument<IActivity>): Promise<void> {
  await ActivityGroup.deleteMany({ activityId: activity._id });
  activity.orderSurveySession = undefined;
}

/**
 * Whether a `dailyReset` activity is due for a rollover. An activity with no
 * stamp yet is only armed, never rolled over — the sweep that runs seconds
 * after the checkbox is ticked must not disturb the day it was ticked on.
 */
export function isDailyResetDue(lastDailyResetDay: string | undefined, today: string): boolean {
  return Boolean(lastDailyResetDay) && lastDailyResetDay !== today;
}

/** Roll over every `dailyReset` activity whose stamped Israel day is not today. */
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

/** Poll every 5 min: reset lands within 5 minutes of Israel midnight. */
export function startDailyResetScheduler(): void {
  const run = () => runDailyResets().catch((err) => console.error('[dailyReset] sweep crashed', err));
  setInterval(run, 5 * 60_000);
  run();
}
