import { IActivity, Activity } from '../models/Activity';
import { ActivityGroup, IActivityGroup, normalizeGroupName } from '../models/ActivityGroup';
import { IReport, Report } from '../models/Report';
import { SmsNotification } from '../models/SmsNotification';
import { getSmsProvider } from './sms/smsProvider';
import { buildRewardDownloadUrl, renderWinnerSms } from '../utils/groupRewardConfig';
import { israelDayString } from '../utils/israelTime';
import { translateText } from './contentTranslation';
import { DEFAULT_LANG } from '../utils/languages';

export const GROUP_REWARD_IDLE_MS = 5 * 60 * 1000;

export const DEFAULT_SMS_TEMPLATE =
  'מזל טוב {name}! ניצחתם עם {score} נקודות. קוד הקופון: {coupon}\n{link}';

function isRewardEnabled(activity: IActivity): boolean {
  return (
    activity.connectionType === 'group'
    && activity.groupEntryMode === 'selfService'
    && !!activity.groupReward?.enabled
    && !!activity.groupReward.couponCode?.trim()
  );
}

function pickGroupWinner(reports: IReport[]): IReport | null {
  const completed = reports.filter((r) => r.completionStatus === 'completed');
  if (completed.length === 0) return null;

  return completed.reduce((best, cur) => {
    const bestScore = (best.data as { totalScore?: number })?.totalScore ?? 0;
    const curScore = (cur.data as { totalScore?: number })?.totalScore ?? 0;
    if (curScore > bestScore) return cur;
    if (curScore < bestScore) return best;
    const bestAt = best.sessionCompletedAt?.getTime() ?? Infinity;
    const curAt = cur.sessionCompletedAt?.getTime() ?? Infinity;
    return curAt < bestAt ? cur : best;
  });
}

async function sendWinnerSms(
  activity: IActivity,
  activityGroup: IActivityGroup,
  groupName: string,
  winner: IReport,
): Promise<void> {
  const couponCode = activity.groupReward!.couponCode.trim();
  const score = (winner.data as { totalScore?: number })?.totalScore ?? 0;
  const downloadLink = activity.groupReward!.downloadToken
    ? buildRewardDownloadUrl(activity.groupReward!.downloadToken)
    : '';
  const rawTemplate = activity.groupReward!.messageTemplate?.trim() || DEFAULT_SMS_TEMPLATE;
  // Sent hours later, so it follows the language the winner played in.
  const template = await translateText(rawTemplate, winner.lang || DEFAULT_LANG);
  const message = renderWinnerSms(template, {
    name: winner.participantName,
    score,
    coupon: couponCode,
    group: groupName,
    link: downloadLink,
  });

  const phone = winner.phoneNumber?.trim();
  if (!phone) {
    await SmsNotification.create({
      activityId: activity._id!,
      activityCode: activity.code,
      groupName,
      activityGroupId: activityGroup._id!,
      reportId: winner._id!,
      recipientName: winner.participantName,
      phoneNumber: '',
      message,
      couponCode,
      status: 'skipped',
      provider: 'stub',
      error: 'Winner has no phone number on file',
    });
    return;
  }

  const notification = await SmsNotification.create({
    activityId: activity._id!,
    activityCode: activity.code,
    groupName,
    activityGroupId: activityGroup._id!,
    reportId: winner._id!,
    recipientName: winner.participantName,
    phoneNumber: phone,
    message,
    couponCode,
    status: 'pending',
    provider: getSmsProvider().name,
  });

  try {
    const result = await getSmsProvider().send(phone, message);
    await SmsNotification.findByIdAndUpdate(notification._id, {
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.providerMessageId,
      error: result.error,
      sentAt: result.success ? new Date() : undefined,
    });
  } catch (err) {
    await SmsNotification.findByIdAndUpdate(notification._id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'SMS send failed',
    });
  }
}

async function awardGroupWinner(
  activity: IActivity,
  activityGroup: IActivityGroup,
  groupName: string,
  reports: IReport[],
): Promise<boolean> {
  const winner = pickGroupWinner(reports);
  if (!winner) return false;

  const couponCode = activity.groupReward!.couponCode.trim();
  const reserved = await ActivityGroup.findOneAndUpdate(
    {
      _id: activityGroup._id!,
      rewardProcessedAt: { $exists: false },
    },
    {
      $set: {
        rewardProcessedAt: new Date(),
        winnerReportId: winner._id!,
        winnerCouponCode: couponCode,
        rewardTimerEndsAt: null,
      },
    },
    { new: true },
  );
  if (!reserved) return false;

  await sendWinnerSms(activity, activityGroup, groupName, winner);
  return true;
}

export async function onGroupMemberCompleted(
  activity: IActivity,
  groupName: string,
): Promise<void> {
  if (!isRewardEnabled(activity)) return;

  const activityGroup = await ActivityGroup.findOne({
    activityId: activity._id,
    activityDay: israelDayString(),
    nameNormalized: normalizeGroupName(groupName),
  });
  if (!activityGroup || activityGroup.rewardProcessedAt) return;

  const reports = await Report.find({
    activityId: activity._id,
    group: groupName,
    joinedAt: { $gte: activityGroup.createdAt },
  }).lean();
  if (reports.length === 0) return;

  const allCompleted = reports.every((r) => r.completionStatus === 'completed');
  if (allCompleted) {
    await awardGroupWinner(activity, activityGroup, groupName, reports as IReport[]);
    return;
  }

  const timerEndsAt = new Date(Date.now() + GROUP_REWARD_IDLE_MS);
  await ActivityGroup.findOneAndUpdate(
    { _id: activityGroup._id, rewardProcessedAt: { $exists: false } },
    { $set: { rewardTimerEndsAt: timerEndsAt } },
  );
}

export async function processExpiredRewardTimers(): Promise<void> {
  const now = new Date();
  const dueGroups = await ActivityGroup.find({
    rewardTimerEndsAt: { $lte: now },
    rewardProcessedAt: { $exists: false },
  }).limit(100);

  for (const activityGroup of dueGroups) {
    const activity = await Activity.findById(activityGroup.activityId);
    if (!activity || !isRewardEnabled(activity)) {
      await ActivityGroup.findByIdAndUpdate(activityGroup._id, { $unset: { rewardTimerEndsAt: 1 } });
      continue;
    }

    const reports = await Report.find({
      activityId: activityGroup.activityId,
      group: activityGroup.name,
      completionStatus: 'completed',
      joinedAt: { $gte: activityGroup.createdAt },
    }).lean();

    if (reports.length === 0) {
      await ActivityGroup.findByIdAndUpdate(activityGroup._id, { $unset: { rewardTimerEndsAt: 1 } });
      continue;
    }

    await awardGroupWinner(activity, activityGroup, activityGroup.name, reports as IReport[]);
  }
}

export async function processGroupRewardIfReady(
  activity: IActivity,
  groupName: string,
): Promise<void> {
  await onGroupMemberCompleted(activity, groupName);
}
