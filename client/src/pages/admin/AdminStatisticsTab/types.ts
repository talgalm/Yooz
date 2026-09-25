
export interface OverviewData {
  totalParticipants: number;
  participantsToday: number;
  participantsThisWeek: number;
  totalActivities: number;
  activeActivities: number;
  completionRate: number;
  avgScore: number;
  medianScore: number;
  avgDurationMs: number;
  medianDurationMs: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface MissionStats {
  puzzleCompletions: number;
  trashSortCompletions: number;
  avgTrashSortScore: number;
}

export interface StatusBreakdown {
  joined: number;
  inProgress: number;
  completed: number;
}

export interface ScoreSummary {
  highest: number;
  lowest: number;
  passRate: number | null;
  scoredParticipants: number;
}

export interface DurationSummary {
  fastestMs: number;
  slowestMs: number;
  completedWithDuration: number;
}

export type ActivityPeriod = 'day' | 'week' | 'month' | 'year' | `day:${string}`;

export interface ActivityDay {
  day: string;
  participants: number;
}

export interface ParticipantInsight {
  name: string;
  group?: string;
  status: 'joined' | 'in_progress' | 'completed';
  score: number;
  durationMs?: number;
  progressPct: number;
  joinedAt: string;
}

export interface ActivityAnalyticsData {
  activity: { _id: string; name: string; code: string; status: string; moduleType?: string };
  period?: ActivityPeriod;
  passThreshold?: number | null;
  maxPossibleScore?: number;
  totalParticipants: number;
  abandonmentCount?: number;
  abandonmentRate?: number;
  completionRate: number;
  avgScore: number;
  medianScore: number;
  avgDurationMs: number;
  medianDurationMs: number;
  scoreDistribution: { min: number; max: number; count: number }[];
  shareClicks: number;
  shareCompleted: number;
  missionStats?: MissionStats;
  statusBreakdown?: StatusBreakdown;
  scoreSummary?: ScoreSummary;
  durationSummary?: DurationSummary;
  topParticipants?: ParticipantInsight[];
  recentParticipants?: ParticipantInsight[];
  totalItemsInModule?: number;
  avgProgressPct?: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  pct: number;
}

export interface ItemStats {
  itemIndex: number;
  itemName: string;
  itemType: string;
  gameType?: string;
  participantCount: number;
  avgScore: number;
  avgDurationMs: number;
  hintUsagePct: number;
  completionPct: number;
  avgMaxScore: number;
  scoreRate: number;
}

export interface QuestionStats {
  questionIndex: number;
  questionText?: string;
  totalAttempts: number;
  correctCount: number;
  successRate: number;
  avgTimeMs: number;
  avgPoints: number;
}

export interface GroupStats {
  group: string;
  memberCount: number;
  avgScore: number;
  completionRate: number;
  avgDurationMs: number;
}

export interface AnomalyAlert {
  type: string;
  severity: 'warning' | 'error';
  itemIndex?: number;
  itemName?: string;
  dropoutPct?: number;
  avgSeconds?: number;
  multiplier?: number;
  message?: string;
}

export interface AuditLogEntry {
  _id: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface RosterParticipant {
  _id: string;
  name: string;
  group?: string;
  status: 'joined' | 'in_progress' | 'completed';
  score: number;
  joinedAt: string;
  excluded: boolean;
}

export interface ReportCardParticipant {
  key: string;
  name: string;
  email: string;
  phone: string;
  grades: Record<string, number | null>;
  finalGrade: number | null;
  activitiesPlayed: number;
}

export interface CombinedReportData {
  activities: { _id: string; name: string; code: string }[];
  participants: ReportCardParticipant[];
  totalParticipants: number;
  avgFinalGrade: number | null;
  period?: ActivityPeriod;
}

export type StatisticsView = 'overview' | 'activity' | 'audit' | 'combined';
export type ActivitySubTab = 'overview' | 'funnel' | 'items' | 'groups' | 'participants' | 'export' | 'automated';
