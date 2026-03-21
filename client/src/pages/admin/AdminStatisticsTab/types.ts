// ─── API response types for analytics ───

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

export interface ActivityAnalyticsData {
  activity: { _id: string; name: string; code: string; status: string };
  totalParticipants: number;
  completionRate: number;
  avgScore: number;
  medianScore: number;
  avgDurationMs: number;
  medianDurationMs: number;
  scoreDistribution: { min: number; max: number; count: number }[];
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
  message: string;
  itemIndex?: number;
  itemName?: string;
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

export type StatisticsView = 'overview' | 'activity' | 'audit';
export type ActivitySubTab = 'overview' | 'funnel' | 'items' | 'groups' | 'export';
