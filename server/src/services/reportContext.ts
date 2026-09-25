
import { Types } from 'mongoose';
import { Activity, Report } from '../models';

export interface ReportContextOptions {
  activityId: string;
  includeParticipants: boolean;
  maxParticipants?: number;
}

export interface ReportContext {
  activity: {
    id: string;
    name: string;
    code: string;
    status: string;
    connectionType: string;
    leaderboardMode?: string;
    moduleType?: string;
    groups: string[];
    loginFields: string[];
    items: { index: number; name: string; type: string; gameType?: string }[];
  };
  totals: {
    participants: number;
    completed: number;
    inProgress: number;
    joinedOnly: number;
    completionRate: number;
    abandonmentRate: number;
    avgScore: number;
    medianScore: number;
    avgDurationMs: number;
    medianDurationMs: number;
    scoredParticipants: number;
    avgProgressPct: number;
    shareClicks: number;
    shareCompleted: number;
  };
  funnel: { step: string; count: number; pct: number }[];
  scoreDistribution: { range: string; count: number }[];
  items: {
    itemIndex: number;
    itemName: string;
    itemType?: string;
    gameType?: string;
    participantCount: number;
    avgScore: number;
    avgMaxScore: number;
    avgDurationMs: number;
    hintUsagePct: number;
    completionPct: number;
  }[];
  groups: {
    group: string;
    memberCount: number;
    avgScore: number;
    completionRate: number;
    avgDurationMs: number;
  }[];
  anomalies: { type: string; severity: string; message: string }[];
  participants?: {
    name: string;
    email?: string;
    phone?: string;
    group?: string;
    status: string;
    score: number;
    progressPct: number;
    durationMs?: number;
    joinedAt: string;
    completedAt?: string;
    itemsCompleted: number;
    hintsUsed: number;
  }[];
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function buildReportContext(opts: ReportContextOptions): Promise<ReportContext | null> {
  const { activityId, includeParticipants } = opts;
  if (!Types.ObjectId.isValid(activityId)) return null;

  const activity = await Activity.findById(activityId).lean();
  if (!activity) return null;

  const reports = await Report.find({ activityId: new Types.ObjectId(activityId) }).lean();

  const totalItemsInModule = Math.max(
    activity.module?.items?.length ?? 0,
    ...reports.map((r) => r.totalItemsInModule ?? 0),
  );

  const scores = reports
    .map((r) => (r.data as { totalScore?: number })?.totalScore ?? 0)
    .filter((s) => s > 0);
  const durations = reports
    .map((r) => r.sessionDurationMs)
    .filter((d): d is number => typeof d === 'number' && d > 0);

  const completedCount = reports.filter((r) => r.completionStatus === 'completed').length;
  const inProgressCount = reports.filter((r) => r.completionStatus === 'in_progress').length;
  const joinedOnlyCount = reports.filter((r) => r.completionStatus === 'joined' || !r.completionStatus).length;
  const abandonmentCount = inProgressCount + joinedOnlyCount;

  const progressValues = reports.map((r) => {
    if (totalItemsInModule <= 0) return r.completionStatus === 'completed' ? 100 : 0;
    return Math.min(100, Math.round(((r.totalItemsCompleted ?? 0) / totalItemsInModule) * 100));
  });
  const avgProgressPct = progressValues.length
    ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
    : 0;

  const startedPlaying = reports.filter((r) => (r.totalItemsCompleted ?? 0) >= 1).length;
  const halfway = reports.filter((r) => {
    const total = r.totalItemsInModule || totalItemsInModule || 1;
    return (r.totalItemsCompleted ?? 0) >= Math.ceil(total / 2);
  }).length;
  const joined = reports.length;
  const funnel = [
    { step: 'joined', count: joined, pct: 100 },
    { step: 'started', count: startedPlaying, pct: joined ? Math.round((startedPlaying / joined) * 100) : 0 },
    { step: 'halfway', count: halfway, pct: joined ? Math.round((halfway / joined) * 100) : 0 },
    { step: 'completed', count: completedCount, pct: joined ? Math.round((completedCount / joined) * 100) : 0 },
  ];

  const buckets = Array.from({ length: 11 }, (_, i) => ({ min: i * 10, max: i * 10 + 10, count: 0 }));
  scores.forEach((s) => {
    const idx = Math.min(Math.floor(s / 10), 10);
    buckets[idx].count++;
  });
  const scoreDistribution = buckets.map((b) => ({ range: `${b.min}-${b.max}`, count: b.count }));

  const itemMap = new Map<number, {
    itemIndex: number;
    itemName: string;
    itemType?: string;
    gameType?: string;
    scoreSum: number;
    maxScoreSum: number;
    durationSum: number;
    hintUsed: number;
    completed: number;
    count: number;
  }>();
  for (const r of reports) {
    const items = (r.data as { itemResults?: { itemIndex: number; itemName?: string; itemType?: string; gameType?: string; score?: number; maxPossibleScore?: number; durationMs?: number; hintUsed?: boolean; completedAt?: Date | null }[] })?.itemResults;
    if (!items) continue;
    for (const it of items) {
      const cur = itemMap.get(it.itemIndex) ?? {
        itemIndex: it.itemIndex,
        itemName: it.itemName ?? `Item ${it.itemIndex + 1}`,
        itemType: it.itemType,
        gameType: it.gameType,
        scoreSum: 0,
        maxScoreSum: 0,
        durationSum: 0,
        hintUsed: 0,
        completed: 0,
        count: 0,
      };
      cur.scoreSum += it.score ?? 0;
      cur.maxScoreSum += it.maxPossibleScore ?? 0;
      cur.durationSum += it.durationMs ?? 0;
      cur.hintUsed += it.hintUsed ? 1 : 0;
      cur.completed += it.completedAt ? 1 : 0;
      cur.count += 1;
      itemMap.set(it.itemIndex, cur);
    }
  }
  const items = Array.from(itemMap.values())
    .sort((a, b) => a.itemIndex - b.itemIndex)
    .map((it) => ({
      itemIndex: it.itemIndex,
      itemName: it.itemName,
      itemType: it.itemType,
      gameType: it.gameType,
      participantCount: it.count,
      avgScore: it.count ? Math.round(it.scoreSum / it.count) : 0,
      avgMaxScore: it.count ? Math.round(it.maxScoreSum / it.count) : 0,
      avgDurationMs: it.count ? Math.round(it.durationSum / it.count) : 0,
      hintUsagePct: it.count ? Math.round((it.hintUsed / it.count) * 100) : 0,
      completionPct: it.count ? Math.round((it.completed / it.count) * 100) : 0,
    }));

  const groupMap = new Map<string, { memberCount: number; scoreSum: number; durationSum: number; durationCount: number; completed: number }>();
  for (const r of reports) {
    if (!r.group) continue;
    const cur = groupMap.get(r.group) ?? { memberCount: 0, scoreSum: 0, durationSum: 0, durationCount: 0, completed: 0 };
    cur.memberCount += 1;
    cur.scoreSum += (r.data as { totalScore?: number })?.totalScore ?? 0;
    if (r.sessionDurationMs) {
      cur.durationSum += r.sessionDurationMs;
      cur.durationCount += 1;
    }
    if (r.completionStatus === 'completed') cur.completed += 1;
    groupMap.set(r.group, cur);
  }
  const groups = Array.from(groupMap.entries())
    .map(([group, g]) => ({
      group,
      memberCount: g.memberCount,
      avgScore: g.memberCount ? Math.round(g.scoreSum / g.memberCount) : 0,
      completionRate: g.memberCount ? Math.round((g.completed / g.memberCount) * 100) : 0,
      avgDurationMs: g.durationCount ? Math.round(g.durationSum / g.durationCount) : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const overallAvgDuration = items.length ? items.reduce((s, i) => s + i.avgDurationMs, 0) / items.length : 0;
  const anomalies: { type: string; severity: string; message: string }[] = [];
  for (const it of items) {
    if (it.participantCount > 0 && it.completionPct < 70) {
      anomalies.push({
        type: 'high_dropout',
        severity: it.completionPct < 50 ? 'error' : 'warning',
        message: `"${it.itemName}" has ${100 - it.completionPct}% dropout rate`,
      });
    }
    if (overallAvgDuration > 0 && it.avgDurationMs > overallAvgDuration * 2) {
      anomalies.push({
        type: 'unusual_time',
        severity: 'warning',
        message: `"${it.itemName}" takes ${Math.round(it.avgDurationMs / 1000)}s avg — ${Math.round(it.avgDurationMs / overallAvgDuration)}x average`,
      });
    }
  }

  const context: ReportContext = {
    activity: {
      id: String(activity._id),
      name: activity.name,
      code: activity.code,
      status: activity.status,
      connectionType: activity.connectionType,
      leaderboardMode: activity.leaderboardMode,
      moduleType: activity.module?.type,
      groups: (activity.groups ?? []).map((g) => g.name),
      loginFields: activity.loginFields ?? [],
      items: (activity.module?.items ?? []).map((it, i) => ({
        index: i,
        name: (it as { name?: string; title?: string }).name || (it as { title?: string }).title || `Item ${i + 1}`,
        type: (it as { type?: string }).type || 'unknown',
        gameType: (it as { gameType?: string }).gameType,
      })),
    },
    totals: {
      participants: joined,
      completed: completedCount,
      inProgress: inProgressCount,
      joinedOnly: joinedOnlyCount,
      completionRate: joined ? Math.round((completedCount / joined) * 100) : 0,
      abandonmentRate: joined ? Math.round((abandonmentCount / joined) * 100) : 0,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      medianScore: Math.round(median(scores)),
      avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      medianDurationMs: Math.round(median(durations)),
      scoredParticipants: scores.length,
      avgProgressPct,
      shareClicks: activity.shareClicks ?? 0,
      shareCompleted: activity.shareCompleted ?? 0,
    },
    funnel,
    scoreDistribution,
    items,
    groups,
    anomalies,
  };

  if (includeParticipants) {
    const max = Math.max(1, Math.min(opts.maxParticipants ?? 200, 500));
    context.participants = reports
      .slice(0, max)
      .map((r) => {
        const data = r.data as { totalScore?: number; itemResults?: { hintUsed?: boolean }[] };
        const totalScore = data?.totalScore ?? 0;
        const hintsUsed = (data?.itemResults ?? []).filter((it) => it.hintUsed).length;
        const progressPct = totalItemsInModule > 0
          ? Math.min(100, Math.round(((r.totalItemsCompleted ?? 0) / totalItemsInModule) * 100))
          : r.completionStatus === 'completed' ? 100 : 0;
        return {
          name: r.participantName,
          email: r.email,
          phone: r.phoneNumber,
          group: r.group,
          status: r.completionStatus ?? 'joined',
          score: totalScore,
          progressPct,
          durationMs: r.sessionDurationMs,
          joinedAt: r.joinedAt ? new Date(r.joinedAt).toISOString() : '',
          completedAt: r.sessionCompletedAt ? new Date(r.sessionCompletedAt).toISOString() : undefined,
          itemsCompleted: r.totalItemsCompleted ?? 0,
          hintsUsed,
        };
      });
  }

  return context;
}
