import { Types } from 'mongoose';
import { Report } from '../models';
import { israelDayRange } from '../utils/israelTime';
import {
  resolvePassThreshold,
  maxScoreForReport,
  normalizeScore,
  resolveCeiling,
} from '../utils/scoreNormalization';

// ─────────────────────────────────────────────────────────────
// Per-activity analytics computations.
//
// These functions are the single source of truth for a single activity's
// statistics. They are consumed both by the admin analytics router
// (behind admin auth) and the public share-link router (behind a share
// token) so the two views never diverge.
// ─────────────────────────────────────────────────────────────

/**
 * A rolling window, or `day:YYYY-MM-DD` for one Israel calendar day. The
 * single-day form is what makes the reports readable for `dailyReset`
 * activities: their history is kept, so the admin needs to slice it back into
 * the days the participants actually experienced. Carrying the day inside the
 * period value means every panel, export and share link already threads it.
 */
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | `day:${string}`;

const SINGLE_DAY_RE = /^day:\d{4}-\d{2}-\d{2}$/;

export function parsePeriod(value: unknown): AnalyticsPeriod {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'year') return value;
  if (typeof value === 'string' && SINGLE_DAY_RE.test(value)) return value as AnalyticsPeriod;
  return 'year';
}

/** The `YYYY-MM-DD` of a `day:` period, or null for the rolling windows. */
export function periodDay(period: AnalyticsPeriod): string | null {
  return SINGLE_DAY_RE.test(period) ? period.slice(4) : null;
}

export function periodStart(period: AnalyticsPeriod): Date {
  const day = periodDay(period);
  if (day) return israelDayRange(day).start;
  const now = new Date();
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start;
  }
  return new Date(now.getFullYear(), 0, 1);
}

/** Exclusive upper bound — only a single-day period has one. */
export function periodEnd(period: AnalyticsPeriod): Date | null {
  const day = periodDay(period);
  return day ? israelDayRange(day).end : null;
}

export type ExcludeIds = (string | Types.ObjectId)[] | undefined;

function reportMatch(
  activityId: string | Types.ObjectId,
  period: AnalyticsPeriod,
  excludeIds?: ExcludeIds,
): Record<string, unknown> {
  const end = periodEnd(period);
  const match: Record<string, unknown> = {
    activityId: new Types.ObjectId(activityId),
    joinedAt: { $gte: periodStart(period), ...(end && { $lt: end }) },
  };
  if (excludeIds && excludeIds.length > 0) {
    match._id = { $nin: excludeIds.map((id) => new Types.ObjectId(id)) };
  }
  return match;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface AnalyticsActivity {
  _id: unknown;
  name: string;
  code: string;
  status: string;
  module?: { type?: string; items?: unknown[] };
  passThreshold?: number | null;
  missionPuzzleCompletions?: number;
  missionTrashSortCompletions?: number;
  missionTrashSortScoreSum?: number;
  shareClicks?: number;
  shareCompleted?: number;
  /** Report `_id`s to drop from every statistic (see Activity.excludedReportIds). */
  excludedReportIds?: ExcludeIds;
}

export async function getActivityAnalytics(activity: AnalyticsActivity, period: AnalyticsPeriod) {
  const activityId = String(activity._id);
  const isMission = activity.module?.type === 'mission';
  const excludeIds = activity.excludedReportIds;

  const reports = await Report.find(
    reportMatch(activityId, period, excludeIds),
    {
      participantName: 1, email: 1, phoneNumber: 1, group: 1,
      joinedAt: 1, 'data.totalScore': 1, 'data.itemResults': 1, completionStatus: 1,
      sessionDurationMs: 1, totalItemsCompleted: 1, totalItemsInModule: 1,
      lastActiveItemIndex: 1,
    },
  ).lean();

  const totalParticipants = reports.length;
  const passThreshold = resolvePassThreshold(activity.passThreshold); // null = no pass grade
  const rawScores = reports
    .map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0)
    .filter((s) => s > 0);
  // Rescale to 0-100 against the activity's maximum achievable score so the pass
  // grade, distribution buckets and tone thresholds are all meaningful.
  const scoreCeiling = resolveCeiling(reports, rawScores);
  const scores = rawScores.map((s) => normalizeScore(s, scoreCeiling));
  const durations = reports
    .map((r) => r.sessionDurationMs)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const completedCount = reports.filter((r) => r.completionStatus === 'completed').length;
  const inProgressCount = reports.filter((r) => r.completionStatus === 'in_progress').length;
  const joinedOnlyCount = reports.filter((r) => r.completionStatus === 'joined' || !r.completionStatus).length;
  const abandonmentCount = inProgressCount + joinedOnlyCount;
  const totalItemsInModule = Math.max(
    activity.module?.items?.length ?? 0,
    ...reports.map((r) => r.totalItemsInModule ?? 0),
  );
  const progressValues = reports.map((r) => {
    if (totalItemsInModule <= 0) return r.completionStatus === 'completed' ? 100 : 0;
    return Math.min(100, Math.round(((r.totalItemsCompleted ?? 0) / totalItemsInModule) * 100));
  });
  const avgProgressPct = progressValues.length > 0
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0;

  // Score distribution histogram: ten 0-100 buckets (scores are normalized to
  // 0-100, so a perfect 100 lands in the 90-100 bucket — no "100-110" bucket).
  const buckets = Array.from({ length: 10 }, (_, i) => ({ min: i * 10, max: i * 10 + 10, count: 0 }));
  scores.forEach((s) => {
    const idx = Math.min(Math.floor(s / 10), 9);
    buckets[idx].count++;
  });

  let missionStats: {
    puzzleCompletions: number;
    trashSortCompletions: number;
    avgTrashSortScore: number;
  } | undefined;

  if (isMission) {
    const puzzleCompletions = activity.missionPuzzleCompletions ?? 0;
    const trashSortCompletions = activity.missionTrashSortCompletions ?? 0;
    const trashSortScoreSum = activity.missionTrashSortScoreSum ?? 0;
    missionStats = {
      puzzleCompletions,
      trashSortCompletions,
      avgTrashSortScore: trashSortCompletions > 0 ? Math.round(trashSortScoreSum / trashSortCompletions) : 0,
    };
  }

  const scoreSummary = {
    highest: scores.length > 0 ? Math.max(...scores) : 0,
    lowest: scores.length > 0 ? Math.min(...scores) : 0,
    passRate: passThreshold !== null && scores.length > 0
      ? Math.round((scores.filter((s) => s >= passThreshold).length / scores.length) * 100)
      : passThreshold === null ? null : 0,
    scoredParticipants: scores.length,
  };

  const durationSummary = {
    fastestMs: durations.length > 0 ? Math.min(...durations) : 0,
    slowestMs: durations.length > 0 ? Math.max(...durations) : 0,
    completedWithDuration: durations.length,
  };

  const participantInsights = reports.map((r) => {
    const rawScore = (r.data as { totalScore?: number })?.totalScore ?? 0;
    const score = normalizeScore(rawScore, scoreCeiling);
    const progressPct = totalItemsInModule > 0
      ? Math.min(100, Math.round(((r.totalItemsCompleted ?? 0) / totalItemsInModule) * 100))
      : r.completionStatus === 'completed' ? 100 : 0;
    return {
      name: r.participantName,
      group: r.group,
      status: r.completionStatus ?? 'joined',
      score,
      durationMs: r.sessionDurationMs,
      progressPct,
      joinedAt: r.joinedAt ? new Date(r.joinedAt).toISOString() : '',
    };
  });

  const topParticipants = [...participantInsights]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.durationMs ?? Number.MAX_SAFE_INTEGER) - (b.durationMs ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 5);

  const recentParticipants = [...participantInsights]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 6);

  return {
    activity: { _id: activity._id, name: activity.name, code: activity.code, status: activity.status, moduleType: activity.module?.type },
    period,
    passThreshold,
    maxPossibleScore: scoreCeiling,
    totalParticipants,
    abandonmentCount,
    abandonmentRate: totalParticipants > 0 ? Math.round((abandonmentCount / totalParticipants) * 100) : 0,
    completionRate: totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    medianScore: Math.round(median(scores)),
    avgDurationMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    medianDurationMs: Math.round(median(durations)),
    scoreDistribution: buckets,
    shareClicks: activity.shareClicks ?? 0,
    shareCompleted: activity.shareCompleted ?? 0,
    statusBreakdown: {
      joined: joinedOnlyCount,
      inProgress: inProgressCount,
      completed: completedCount,
    },
    scoreSummary,
    durationSummary,
    topParticipants,
    recentParticipants,
    totalItemsInModule,
    avgProgressPct,
    ...(missionStats && { missionStats }),
  };
}

export async function getFunnel(activityId: string | Types.ObjectId, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  const reports = await Report.find(
    reportMatch(activityId, period, excludeIds),
    { completionStatus: 1, totalItemsCompleted: 1, totalItemsInModule: 1 },
  ).lean();

  const joined = reports.length;
  const startedPlaying = reports.filter((r) => (r.totalItemsCompleted ?? 0) >= 1).length;
  const completedHalf = reports.filter((r) => {
    const total = r.totalItemsInModule || 1;
    return (r.totalItemsCompleted ?? 0) >= Math.ceil(total / 2);
  }).length;
  const completed = reports.filter((r) => r.completionStatus === 'completed').length;

  return [
    { step: 'joined', count: joined, pct: 100 },
    { step: 'started', count: startedPlaying, pct: joined > 0 ? Math.round((startedPlaying / joined) * 100) : 0 },
    { step: 'halfway', count: completedHalf, pct: joined > 0 ? Math.round((completedHalf / joined) * 100) : 0 },
    { step: 'completed', count: completed, pct: joined > 0 ? Math.round((completed / joined) * 100) : 0 },
  ];
}

export async function getItems(activityId: string | Types.ObjectId, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  const pipeline = await Report.aggregate([
    { $match: { ...reportMatch(activityId, period, excludeIds), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    {
      $group: {
        _id: '$data.itemResults.itemIndex',
        itemName: { $first: '$data.itemResults.itemName' },
        itemType: { $first: '$data.itemResults.itemType' },
        gameType: { $first: '$data.itemResults.gameType' },
        participantCount: { $sum: 1 },
        avgScore: { $avg: '$data.itemResults.score' },
        avgDurationMs: { $avg: '$data.itemResults.durationMs' },
        hintUsageCount: { $sum: { $cond: [{ $eq: ['$data.itemResults.hintUsed', true] }, 1, 0] } },
        completionCount: { $sum: { $cond: [{ $ne: ['$data.itemResults.completedAt', null] }, 1, 0] } },
        avgMaxScore: { $avg: '$data.itemResults.maxPossibleScore' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return pipeline.map((item) => {
    const avgScore = Math.round(item.avgScore ?? 0);
    const avgMaxScore = Math.round(item.avgMaxScore ?? 0);
    return {
      itemIndex: item._id,
      itemName: item.itemName,
      itemType: item.itemType,
      gameType: item.gameType,
      participantCount: item.participantCount,
      avgScore,
      avgMaxScore,
      // Per-station score on the shared 0-100 scale (score as % of the station's max).
      scoreRate: avgMaxScore > 0 ? Math.round((avgScore / avgMaxScore) * 100) : avgScore,
      avgDurationMs: Math.round(item.avgDurationMs ?? 0),
      hintUsagePct: item.participantCount > 0 ? Math.round((item.hintUsageCount / item.participantCount) * 100) : 0,
      completionPct: item.participantCount > 0 ? Math.round((item.completionCount / item.participantCount) * 100) : 0,
    };
  });
}

export async function getQuestions(activityId: string | Types.ObjectId, itemIndex: number, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  const pipeline = await Report.aggregate([
    { $match: { ...reportMatch(activityId, period, excludeIds), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    { $match: { 'data.itemResults.itemIndex': itemIndex } },
    { $unwind: '$data.itemResults.questionAnswers' },
    {
      $group: {
        _id: '$data.itemResults.questionAnswers.questionIndex',
        questionText: { $first: '$data.itemResults.questionAnswers.questionText' },
        totalAttempts: { $sum: 1 },
        correctCount: { $sum: { $cond: ['$data.itemResults.questionAnswers.isCorrect', 1, 0] } },
        avgTimeMs: { $avg: '$data.itemResults.questionAnswers.timeSpentMs' },
        avgPoints: { $avg: '$data.itemResults.questionAnswers.pointsEarned' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return pipeline.map((q) => ({
    questionIndex: q._id,
    questionText: q.questionText,
    totalAttempts: q.totalAttempts,
    correctCount: q.correctCount,
    successRate: q.totalAttempts > 0 ? Math.round((q.correctCount / q.totalAttempts) * 100) : 0,
    avgTimeMs: Math.round(q.avgTimeMs ?? 0),
    avgPoints: Math.round(q.avgPoints ?? 0),
  }));
}

export async function getGroups(activityId: string | Types.ObjectId, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  const pipeline = await Report.aggregate([
    { $match: { ...reportMatch(activityId, period, excludeIds), group: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$group',
        memberCount: { $sum: 1 },
        avgScore: { $avg: '$data.totalScore' },
        completedCount: { $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] } },
        avgDurationMs: { $avg: '$sessionDurationMs' },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);

  // Resolve the activity ceiling so per-group averages share the 0-100 scale.
  const ceilingReports = await Report.find(
    { ...reportMatch(activityId, period, excludeIds), 'data.itemResults': { $exists: true } },
    { 'data.itemResults.itemIndex': 1, 'data.itemResults.maxPossibleScore': 1, 'data.totalScore': 1 },
  ).lean();
  const ceilingRawScores = ceilingReports
    .map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0)
    .filter((s) => s > 0);
  const scoreCeiling = resolveCeiling(ceilingReports, ceilingRawScores);

  return pipeline.map((g) => ({
    group: g._id,
    memberCount: g.memberCount,
    avgScore: normalizeScore(g.avgScore ?? 0, scoreCeiling),
    completionRate: g.memberCount > 0 ? Math.round((g.completedCount / g.memberCount) * 100) : 0,
    avgDurationMs: Math.round(g.avgDurationMs ?? 0),
  }));
}

export async function getAnomalies(activityId: string | Types.ObjectId, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  const itemStats = await Report.aggregate([
    { $match: { ...reportMatch(activityId, period, excludeIds), 'data.itemResults': { $exists: true } } },
    { $unwind: '$data.itemResults' },
    {
      $group: {
        _id: '$data.itemResults.itemIndex',
        itemName: { $first: '$data.itemResults.itemName' },
        participantCount: { $sum: 1 },
        completionCount: { $sum: { $cond: [{ $ne: ['$data.itemResults.completedAt', null] }, 1, 0] } },
        avgDurationMs: { $avg: '$data.itemResults.durationMs' },
      },
    },
  ]);

  const overallAvgDuration = itemStats.length > 0
    ? itemStats.reduce((s, i) => s + (i.avgDurationMs ?? 0), 0) / itemStats.length
    : 0;

  // Alerts carry structured numbers (not pre-built strings) so the client can
  // render the message in the active language (Hebrew/English).
  const alerts: {
    type: string;
    severity: 'warning' | 'error';
    itemIndex?: number;
    itemName?: string;
    dropoutPct?: number;
    avgSeconds?: number;
    multiplier?: number;
  }[] = [];

  for (const item of itemStats) {
    const completionRate = item.participantCount > 0 ? item.completionCount / item.participantCount : 1;
    const avgDur = item.avgDurationMs ?? 0;

    if (completionRate < 0.7) {
      alerts.push({
        type: 'high_dropout',
        severity: completionRate < 0.5 ? 'error' : 'warning',
        itemIndex: item._id,
        itemName: item.itemName,
        dropoutPct: Math.round((1 - completionRate) * 100),
      });
    }

    if (overallAvgDuration > 0 && avgDur > overallAvgDuration * 2) {
      alerts.push({
        type: 'unusual_time',
        severity: 'warning',
        itemIndex: item._id,
        itemName: item.itemName,
        avgSeconds: Math.round(avgDur / 1000),
        multiplier: Math.round(avgDur / overallAvgDuration),
      });
    }
  }

  return alerts;
}

/** Reports for the export workbook (single activity, scoped by period). */
export async function getExportReports(activityId: string | Types.ObjectId, period: AnalyticsPeriod, excludeIds?: ExcludeIds) {
  return Report.find(reportMatch(activityId, period, excludeIds)).lean();
}

// ─────────────────────────────────────────────────────────────
// Combined multi-activity report card.
//
// Follows the SAME person across several activities: their normalized grade in
// each, plus a final grade = the average of their own grades. Each activity is
// normalized against its own ceiling so grades are comparable. Exclusions and
// the period filter are honored per activity (via reportMatch).
// ─────────────────────────────────────────────────────────────

export interface CombinedReportActivity {
  _id: unknown;
  name: string;
  code: string;
  excludedReportIds?: ExcludeIds;
}

export interface ReportCardParticipant {
  key: string;
  name: string;
  email: string;
  phone: string;
  /** activityId → normalized 0-100 grade, or null when they didn't play it. */
  grades: Record<string, number | null>;
  /** null = the participant appears but has no score in any selected activity. */
  finalGrade: number | null;
  activitiesPlayed: number;
}

/** Match the same person across activities: email → phone (digits) → name. */
function identityKey(r: { _id?: unknown; email?: string; phoneNumber?: string; participantName?: string }): string {
  const email = (r.email || '').trim().toLowerCase();
  if (email) return `e:${email}`;
  const phone = (r.phoneNumber || '').replace(/\D/g, '');
  if (phone) return `p:${phone}`;
  const name = (r.participantName || '').trim().toLowerCase();
  // Anonymous quick-join (empty loginFields) leaves the name as the literal
  // 'Participant' placeholder with no email/phone — that is NOT an identifier, so
  // key by report id to avoid collapsing every anonymous player into one row.
  if (!name || name === 'participant') return `r:${String(r._id ?? '')}`;
  return `n:${name}`;
}

export async function getCombinedReportCard(activities: CombinedReportActivity[], period: AnalyticsPeriod) {
  const activityMeta = activities.map((a) => ({ _id: String(a._id), name: a.name, code: a.code }));

  interface Entry {
    key: string;
    name: string;
    email: string;
    phone: string;
    latestJoinedAt: number;
    perActivity: Map<string, { grade: number; joinedAt: number }>;
  }
  const map = new Map<string, Entry>();

  for (const activity of activities) {
    const activityId = String(activity._id);
    const reports = await Report.find(
      reportMatch(activityId, period, activity.excludedReportIds),
      {
        participantName: 1, email: 1, phoneNumber: 1, joinedAt: 1,
        'data.totalScore': 1, 'data.itemResults.itemIndex': 1, 'data.itemResults.maxPossibleScore': 1,
      },
    ).lean();

    // Per-activity ceiling so grades land on a comparable 0-100 scale.
    const rawScores = reports.map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0).filter((s) => s > 0);
    const ceiling = resolveCeiling(reports, rawScores);

    // Deterministic order so "most recent attempt" is stable on joinedAt ties.
    reports.sort((a, b) => {
      const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return ta !== tb ? ta - tb : String(a._id).localeCompare(String(b._id));
    });

    for (const r of reports) {
      const key = identityKey(r);
      const joinedAt = r.joinedAt ? new Date(r.joinedAt).getTime() : 0;
      const raw = (r.data as { totalScore?: number })?.totalScore ?? 0;

      let entry = map.get(key);
      if (!entry) {
        entry = { key, name: '', email: '', phone: '', latestJoinedAt: -1, perActivity: new Map() };
        map.set(key, entry);
      }
      // Only a scored attempt counts as "played" (mirrors the s > 0 filter the
      // per-activity analytics use). Join-only / zero-score reports create no
      // grade, so they never deflate the final-grade average. Keep the most
      // recent scored attempt per activity.
      if (raw > 0) {
        const grade = normalizeScore(raw, ceiling);
        const existing = entry.perActivity.get(activityId);
        if (!existing || joinedAt >= existing.joinedAt) {
          entry.perActivity.set(activityId, { grade, joinedAt });
        }
      }
      // Display identity = the person's most recent report across all activities
      // (updated even for join-only reports so a scored-elsewhere person resolves).
      if (joinedAt >= entry.latestJoinedAt) {
        entry.latestJoinedAt = joinedAt;
        entry.name = r.participantName || entry.name;
        entry.email = r.email || entry.email;
        entry.phone = r.phoneNumber || entry.phone;
      }
    }
  }

  const participants: ReportCardParticipant[] = [...map.values()].map((entry) => {
    const grades: Record<string, number | null> = {};
    let sum = 0;
    let count = 0;
    for (const meta of activityMeta) {
      const pa = entry.perActivity.get(meta._id);
      if (pa) {
        grades[meta._id] = pa.grade;
        sum += pa.grade;
        count += 1;
      } else {
        grades[meta._id] = null;
      }
    }
    return {
      key: entry.key,
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      grades,
      // Everyone with a report appears. A participant with no score in any
      // selected activity gets a null final grade (shown as "—") rather than a 0,
      // so they neither vanish nor deflate the average.
      finalGrade: count > 0 ? Math.round(sum / count) : null,
      activitiesPlayed: count,
    };
  });

  // Highest graded first; ungraded ("—") participants sink to the bottom.
  participants.sort((a, b) => (b.finalGrade ?? -1) - (a.finalGrade ?? -1));

  const totalParticipants = participants.length;
  const graded = participants.filter(
    (p): p is ReportCardParticipant & { finalGrade: number } => p.finalGrade !== null,
  );
  const avgFinalGrade = graded.length > 0
    ? Math.round(graded.reduce((s, p) => s + p.finalGrade, 0) / graded.length)
    : null;

  return { activities: activityMeta, participants, totalParticipants, avgFinalGrade, period };
}
