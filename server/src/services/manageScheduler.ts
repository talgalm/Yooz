import { TimeEntry, MAX_TIMER_HOURS } from '../models/manage/TimeEntry';
import { stopRunningTimer } from '../routes/manageTime';

const FIFTEEN_MINUTES = 15 * 60_000;

export async function autoStopTimers(): Promise<number> {
  const cutoff = new Date(Date.now() - MAX_TIMER_HOURS * 3600_000);
  const stale = await TimeEntry.find({ endedAt: null, startedAt: { $lt: cutoff } })
    .select('userId').lean();

  let stopped = 0;
  for (const timer of stale) {
    try {
      if (await stopRunningTimer(String(timer.userId), { autoStopped: true })) stopped++;
    } catch (err) {
      console.error('[manage] autoStopTimers failed for user', String(timer.userId), err);
    }
  }
  if (stopped > 0) console.log(`[manage] autoStopTimers: stopped ${stopped} runaway timer(s)`);
  return stopped;
}

export function startManageScheduler(): void {
  setInterval(() => {
    autoStopTimers().catch((err) => console.error('[manage] autoStopTimers crashed', err));
  }, FIFTEEN_MINUTES);
  console.log('[manage] scheduler started (autoStopTimers every 15m)');
}
