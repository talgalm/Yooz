import type { HydratedDocument } from 'mongoose';
import crypto from 'crypto';
import { Resend } from 'resend';
import { Activity, Report, type IActivity } from '../models';
import { RESEND_API_KEY, EMAIL_FROM } from '../config';
import { buildAnalyticsWorkbookBuffer, type ExportActivity, type ExportReport } from '../utils/analyticsExcelExport';
import { israelDayString, israelHour, israelDayOfWeek } from '../utils/israelTime';

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive: 'דוח מנהלים מלא',
  participants: 'דוח משתתפים',
  scores: 'דוח ציונים',
  progress: 'דוח התקדמות',
};

/** Deterministic fingerprint of the current report data, for skipIfUnchanged. Exported for testing. */
export function computeReportsSnapshot(reports: ExportReport[]): string {
  const summary = reports
    .map((r) => `${r.participantName}|${r.completionStatus ?? ''}|${r.data?.totalScore ?? 0}|${r.sessionCompletedAt ?? ''}`)
    .sort()
    .join('\n');
  return crypto.createHash('sha256').update(summary).digest('hex');
}

/** Exported for testing — the same-hour idempotency guard runScheduledReports applies first. */
export function sameIsraelHour(a: Date, b: Date): boolean {
  return israelDayString(a) === israelDayString(b) && israelHour(a) === israelHour(b);
}

/**
 * Builds the activity's configured report and emails it to its saved recipients via
 * Resend, then stamps lastSentAt/lastSentSnapshot. The one place that actually sends —
 * used by both the hourly cron (runScheduledReports) and the manual "Send now" admin
 * action, so a test send and a scheduled send always go through the same path.
 */
export async function sendScheduledReportNow(activity: HydratedDocument<IActivity>): Promise<{ resendId?: string }> {
  const settings = activity.scheduledReport;
  if (!settings) throw new Error('No scheduledReport configured for this activity');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  if (settings.recipients.length === 0) throw new Error('No recipients configured');

  const reports = await Report.find({ activityId: activity._id }).lean();
  const buffer = await buildAnalyticsWorkbookBuffer(
    activity as unknown as ExportActivity,
    reports as ExportReport[],
    settings.reportType,
  );
  const label = REPORT_TYPE_LABELS[settings.reportType] || settings.reportType;
  const safeName = activity.name.replace(/[^a-zA-Z0-9֐-׿]/g, '_');
  const fileName = `${safeName}_${settings.reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const resend = new Resend(RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: settings.recipients,
    subject: `${label} - ${activity.name}`,
    text: `מצורף ${label} עבור הפעילות "${activity.name}" (קוד: ${activity.code}).`,
    attachments: [{ filename: fileName, content: buffer }],
  });
  if (error) throw new Error(error.message || 'Resend send failed');

  settings.lastSentAt = new Date();
  settings.lastSentSnapshot = computeReportsSnapshot(reports as ExportReport[]);
  await activity.save();

  return { resendId: data?.id };
}

/**
 * Hourly sweep, per activity with scheduledReport.enabled: skip unless the Israel hour
 * (and, for weekly, the day) matches scheduleHour/dayOfWeek; skip if already sent within
 * this same Israel hour (idempotency guard — see startScheduledReportsScheduler); skip if
 * skipIfUnchanged and nothing changed since lastSentSnapshot; otherwise send. Does not
 * mutate report data — only reads it and stamps the schedule's own lastSentAt/lastSentSnapshot.
 */
export async function runScheduledReports(options: { verbose?: boolean } = {}): Promise<number> {
  const { verbose = false } = options;
  const now = new Date();
  const currentHour = israelHour(now);
  const currentDayOfWeek = israelDayOfWeek(now);
  let sent = 0;

  const candidates = await Activity.find({ 'scheduledReport.enabled': true });
  if (verbose) console.log(`[scheduledReports] ${candidates.length} activity/activities have automated reports enabled`);

  for (const activity of candidates) {
    const settings = activity.scheduledReport;
    if (!settings) continue;
    try {
      // Every `continue` below is a real reason to skip — logged only in verbose
      // mode (the manual check-scheduled-reports.ts script) so the normal 5-min
      // production poll doesn't spam the log for every not-yet-due activity.
      if (settings.lastSentAt && sameIsraelHour(settings.lastSentAt, now)) {
        if (verbose) console.log(`[scheduledReports] skip ${activity.code}: already sent within this Israel hour (lastSentAt=${settings.lastSentAt.toISOString()})`);
        continue;
      }
      if (settings.scheduleHour !== currentHour) {
        if (verbose) console.log(`[scheduledReports] skip ${activity.code}: scheduled for hour ${settings.scheduleHour}, current Israel hour is ${currentHour}`);
        continue;
      }
      if (settings.frequency === 'weekly' && settings.dayOfWeek !== currentDayOfWeek) {
        if (verbose) console.log(`[scheduledReports] skip ${activity.code}: scheduled for day-of-week ${settings.dayOfWeek}, today is ${currentDayOfWeek}`);
        continue;
      }

      if (settings.skipIfUnchanged && settings.lastSentSnapshot) {
        const reports = await Report.find({ activityId: activity._id }).lean();
        const snapshot = computeReportsSnapshot(reports as ExportReport[]);
        if (snapshot === settings.lastSentSnapshot) {
          console.log(`[scheduledReports] skip ${activity.code}: no change since last send`);
          continue;
        }
      }

      await sendScheduledReportNow(activity);
      sent++;
      console.log(`[scheduledReports] sent ${settings.reportType} report for ${activity.code} to ${settings.recipients.length} recipient(s)`);
    } catch (err) {
      console.error('[scheduledReports] failed for activity', activity.code, err);
    }
  }
  if (sent > 0 || verbose) console.log(`[scheduledReports] sweep complete: checked ${candidates.length}, sent ${sent} report(s)`);
  return sent;
}

const ONE_HOUR_MS = 60 * 60_000;

/**
 * Runs exactly once per hour, aligned to the top of the hour — not a 5-minute
 * poll. Israel's UTC offset is always a whole number of hours (+2/+3), so a UTC
 * hour boundary is always an Israel wall-clock hour boundary too; no timezone
 * math needed for the alignment itself, only for reading *which* hour it is
 * (israelHour, used inside runScheduledReports).
 *
 * Trade-off, chosen deliberately over activityReset.ts's 5-min poll: a single
 * per-hour tick has no self-healing if that exact tick is missed (e.g. a
 * restart landing on the boundary) — it simply waits for the next hour. That's
 * the intentional cost of not running more often than once an hour.
 */
export function startScheduledReportsScheduler(): void {
  const run = () => runScheduledReports().catch((err) => console.error('[scheduledReports] sweep crashed', err));
  const scheduleNextTick = () => {
    const msUntilNextHour = ONE_HOUR_MS - (Date.now() % ONE_HOUR_MS);
    setTimeout(() => {
      run();
      setInterval(run, ONE_HOUR_MS);
    }, msUntilNextHour);
  };
  scheduleNextTick();
  console.log('[scheduledReports] cron started, checking once per hour (aligned to the top of the hour)');
}
