import ExcelJS from 'exceljs';
import {
  resolvePassThreshold,
  normalizeScore,
  resolveCeiling,
} from './scoreNormalization';

export type AnalyticsExportType = 'executive' | 'participants' | 'scores' | 'progress';

type CompletionStatus = 'joined' | 'in_progress' | 'completed';
type Tone = 'green' | 'blue' | 'amber' | 'red' | 'slate';

export interface ExportActivity {
  name: string;
  code: string;
  status: string;
  connectionType?: string;
  module?: {
    type?: string;
    items?: unknown[];
  };
  groups?: { name: string }[];
  shareClicks?: number;
  shareCompleted?: number;
  missionPuzzleCompletions?: number;
  missionTrashSortCompletions?: number;
  missionTrashSortScoreSum?: number;
  passThreshold?: number | null;
}

export interface ExportQuestionAnswer {
  questionIndex: number;
  questionText?: string;
  selectedAnswers?: number[];
  correctAnswers?: number[];
  isCorrect?: boolean;
  pointsEarned?: number;
  timeSpentMs?: number;
}

export interface ExportItemResult {
  itemIndex: number;
  itemId?: string;
  itemType?: string;
  itemName?: string;
  gameType?: string;
  score?: number;
  maxPossibleScore?: number;
  startedAt?: Date | string;
  completedAt?: Date | string;
  durationMs?: number;
  hintUsed?: boolean;
  hintPenalty?: number;
  questionAnswers?: ExportQuestionAnswer[];
  attempts?: number;
  metadata?: Record<string, unknown>;
}

export interface ExportReport {
  participantName: string;
  email?: string;
  phoneNumber?: string;
  connectionType?: string;
  group?: string;
  joinedAt?: Date | string;
  data?: {
    totalScore?: number;
    scores?: { gameName: string; score: number }[];
    itemResults?: ExportItemResult[];
  };
  completionStatus?: CompletionStatus;
  sessionStartedAt?: Date | string;
  sessionCompletedAt?: Date | string;
  sessionDurationMs?: number;
  totalItemsCompleted?: number;
  totalItemsInModule?: number;
  lastActiveItemIndex?: number;
}

interface ParticipantRow {
  index: number;
  rank: number;
  name: string;
  email: string;
  phone: string;
  group: string;
  joinedAt: string;
  startedAt: string;
  completedAt: string;
  status: CompletionStatus;
  statusLabel: string;
  totalScore: number;
  normalizedScore: number;
  passLabel: string;
  progressPct: number;
  itemsCompleted: number;
  totalItems: number;
  lastActiveItem: number;
  durationMs: number;
  durationLabel: string;
}

interface ItemAggregate {
  itemIndex: number;
  itemName: string;
  itemType: string;
  gameType: string;
  reachedCount: number;
  completedCount: number;
  reachRate: number;
  completionRate: number;
  avgScore: number;
  avgMaxScore: number;
  scoreRate: number;
  avgDurationMs: number;
  avgDurationLabel: string;
  hintUsageRate: number;
  attemptsAvg: number;
  risk: Tone;
}

interface QuestionAggregate {
  itemIndex: number;
  itemName: string;
  questionIndex: number;
  questionText: string;
  attempts: number;
  correctCount: number;
  successRate: number;
  avgTimeMs: number;
  avgTimeLabel: string;
  avgPoints: number;
  risk: Tone;
}

interface GroupAggregate {
  group: string;
  memberCount: number;
  completedCount: number;
  inProgressCount: number;
  joinedOnlyCount: number;
  completionRate: number;
  avgScore: number;
  avgProgressPct: number;
  avgDurationMs: number;
  avgDurationLabel: string;
  topScore: number;
  followUpCount: number;
}

interface Recommendation {
  severity: 'גבוהה' | 'בינונית' | 'נמוכה' | 'חיובי';
  topic: string;
  insight: string;
  action: string;
  metric: string;
  tone: Tone;
}

interface ExportStats {
  participants: ParticipantRow[];
  items: ItemAggregate[];
  questions: QuestionAggregate[];
  groups: GroupAggregate[];
  recommendations: Recommendation[];
  totalParticipants: number;
  completedCount: number;
  inProgressCount: number;
  joinedOnlyCount: number;
  completionRate: number;
  avgScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number | null;
  passThreshold: number | null;
  maxPossibleScore: number;
  avgDurationMs: number;
  medianDurationMs: number;
  fastestMs: number;
  slowestMs: number;
  totalItemsInModule: number;
  avgProgressPct: number;
  scoreBuckets: { range: string; count: number }[];
}

type TableColumn<T> = {
  header: string;
  width?: number;
  value: (row: T) => string | number;
};

const COLORS = {
  dark: '102A43',
  blue: '2D8BD8',
  blueSoft: 'DDEFFF',
  green: '1E9E63',
  greenSoft: 'DFF7E9',
  amber: 'F5A524',
  amberSoft: 'FFF1D6',
  red: 'D64545',
  redSoft: 'FFE2E2',
  slate: '52616B',
  slateSoft: 'EEF2F6',
  white: 'FFFFFF',
  border: 'D8E0EA',
};

const STATUS_LABELS: Record<CompletionStatus, string> = {
  joined: 'נכנס בלבד',
  in_progress: 'בתהליך',
  completed: 'הושלם',
};

const EXPORT_LABELS: Record<AnalyticsExportType, string> = {
  executive: 'דוח מנהלים מלא',
  participants: 'דוח משתתפים',
  scores: 'דוח ציונים',
  progress: 'דוח התקדמות',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

function toneColor(tone: Tone) {
  if (tone === 'green') return COLORS.green;
  if (tone === 'blue') return COLORS.blue;
  if (tone === 'amber') return COLORS.amber;
  if (tone === 'red') return COLORS.red;
  return COLORS.slate;
}

function toneSoftColor(tone: Tone) {
  if (tone === 'green') return COLORS.greenSoft;
  if (tone === 'blue') return COLORS.blueSoft;
  if (tone === 'amber') return COLORS.amberSoft;
  if (tone === 'red') return COLORS.redSoft;
  return COLORS.slateSoft;
}

function pctTone(value: number): Tone {
  if (value >= 85) return 'green';
  if (value >= 70) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

function normalizeStatus(status?: string): CompletionStatus {
  if (status === 'completed' || status === 'in_progress' || status === 'joined') return status;
  return 'joined';
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDate(value?: Date | string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} שניות`;
  if (seconds === 0) return `${minutes} דקות`;
  return `${minutes}:${String(seconds).padStart(2, '0')} דקות`;
}

function safeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet';
}

function addSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const base = safeSheetName(name);
  let candidate = base;
  let n = 2;
  while (workbook.getWorksheet(candidate)) {
    const suffix = ` ${n}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    n += 1;
  }
  return workbook.addWorksheet(candidate);
}

function getTotalItems(activity: ExportActivity, reports: ExportReport[]) {
  return Math.max(
    activity.module?.items?.length ?? 0,
    ...reports.map((report) => report.totalItemsInModule ?? 0),
    ...reports.map((report) => report.data?.itemResults?.length ?? 0),
  );
}

function getProgressPct(report: ExportReport, totalItemsInModule: number) {
  const status = normalizeStatus(report.completionStatus);
  if (totalItemsInModule <= 0) return status === 'completed' ? 100 : 0;
  return Math.min(100, Math.round(((report.totalItemsCompleted ?? 0) / totalItemsInModule) * 100));
}

function getReportScore(report: ExportReport) {
  return numberOrZero(report.data?.totalScore);
}

function buildParticipants(
  reports: ExportReport[],
  totalItemsInModule: number,
  scoreCeiling: number,
  passThreshold: number | null,
): ParticipantRow[] {
  const ranked = reports
    .map((report, index) => ({
      report,
      originalIndex: index,
      score: getReportScore(report),
      duration: report.sessionDurationMs ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.duration - b.duration;
    });

  const rankByOriginalIndex = new Map<number, number>();
  ranked.forEach((entry, index) => rankByOriginalIndex.set(entry.originalIndex, index + 1));

  return reports.map((report, index) => {
    const status = normalizeStatus(report.completionStatus);
    const totalScore = getReportScore(report);
    const normalizedScore = normalizeScore(totalScore, scoreCeiling);
    const totalItems = Math.max(totalItemsInModule, report.totalItemsInModule ?? 0);
    const durationMs = numberOrZero(report.sessionDurationMs);
    return {
      index: index + 1,
      rank: rankByOriginalIndex.get(index) ?? index + 1,
      name: report.participantName || 'ללא שם',
      email: report.email || '',
      phone: report.phoneNumber || '',
      group: report.group || 'ללא קבוצה',
      joinedAt: formatDate(report.joinedAt),
      startedAt: formatDate(report.sessionStartedAt),
      completedAt: formatDate(report.sessionCompletedAt),
      status,
      statusLabel: STATUS_LABELS[status],
      totalScore,
      normalizedScore,
      passLabel: passThreshold === null
        ? '—'
        : totalScore > 0 && normalizedScore >= passThreshold ? 'עבר' : 'לא עבר',
      progressPct: getProgressPct(report, totalItems),
      itemsCompleted: report.totalItemsCompleted ?? 0,
      totalItems,
      lastActiveItem: (report.lastActiveItemIndex ?? 0) + 1,
      durationMs,
      durationLabel: formatDuration(durationMs),
    };
  });
}

function buildItems(reports: ExportReport[], totalParticipants: number): ItemAggregate[] {
  const map = new Map<number, {
    itemIndex: number;
    itemName: string;
    itemType: string;
    gameType: string;
    reachedCount: number;
    completedCount: number;
    scoreSum: number;
    scoreCount: number;
    maxScoreSum: number;
    maxScoreCount: number;
    durationSum: number;
    durationCount: number;
    hintCount: number;
    attemptsSum: number;
    attemptsCount: number;
  }>();

  reports.forEach((report) => {
    (report.data?.itemResults ?? []).forEach((item) => {
      const itemIndex = item.itemIndex ?? 0;
      const current = map.get(itemIndex) ?? {
        itemIndex,
        itemName: item.itemName || `תחנה ${itemIndex + 1}`,
        itemType: item.itemType || '',
        gameType: item.gameType || '',
        reachedCount: 0,
        completedCount: 0,
        scoreSum: 0,
        scoreCount: 0,
        maxScoreSum: 0,
        maxScoreCount: 0,
        durationSum: 0,
        durationCount: 0,
        hintCount: 0,
        attemptsSum: 0,
        attemptsCount: 0,
      };

      current.itemName = current.itemName || item.itemName || `תחנה ${itemIndex + 1}`;
      current.itemType = current.itemType || item.itemType || '';
      current.gameType = current.gameType || item.gameType || '';
      current.reachedCount += 1;
      if (item.completedAt) current.completedCount += 1;
      if (typeof item.score === 'number') {
        current.scoreSum += item.score;
        current.scoreCount += 1;
      }
      if (typeof item.maxPossibleScore === 'number' && item.maxPossibleScore > 0) {
        current.maxScoreSum += item.maxPossibleScore;
        current.maxScoreCount += 1;
      }
      if (typeof item.durationMs === 'number' && item.durationMs > 0) {
        current.durationSum += item.durationMs;
        current.durationCount += 1;
      }
      if (item.hintUsed) current.hintCount += 1;
      if (typeof item.attempts === 'number' && item.attempts > 0) {
        current.attemptsSum += item.attempts;
        current.attemptsCount += 1;
      }
      map.set(itemIndex, current);
    });
  });

  return [...map.values()]
    .sort((a, b) => a.itemIndex - b.itemIndex)
    .map((item) => {
      const avgScore = Math.round(average(item.scoreCount ? [item.scoreSum / item.scoreCount] : []));
      const avgMaxScore = Math.round(average(item.maxScoreCount ? [item.maxScoreSum / item.maxScoreCount] : []));
      const scoreRate = avgMaxScore > 0 ? Math.round((avgScore / avgMaxScore) * 100) : avgScore;
      const completionRate = item.reachedCount > 0 ? Math.round((item.completedCount / item.reachedCount) * 100) : 0;
      const reachRate = totalParticipants > 0 ? Math.round((item.reachedCount / totalParticipants) * 100) : 0;
      const hintUsageRate = item.reachedCount > 0 ? Math.round((item.hintCount / item.reachedCount) * 100) : 0;
      const risk: Tone = completionRate < 65 || scoreRate < 50
        ? 'red'
        : completionRate < 82 || hintUsageRate > 30
          ? 'amber'
          : completionRate >= 92 && scoreRate >= 78
            ? 'green'
            : 'blue';

      const avgDurationMs = Math.round(item.durationCount > 0 ? item.durationSum / item.durationCount : 0);
      return {
        itemIndex: item.itemIndex,
        itemName: item.itemName,
        itemType: item.itemType,
        gameType: item.gameType,
        reachedCount: item.reachedCount,
        completedCount: item.completedCount,
        reachRate,
        completionRate,
        avgScore,
        avgMaxScore,
        scoreRate,
        avgDurationMs,
        avgDurationLabel: formatDuration(avgDurationMs),
        hintUsageRate,
        attemptsAvg: Math.round(item.attemptsCount > 0 ? item.attemptsSum / item.attemptsCount : 0),
        risk,
      };
    });
}

function buildQuestions(reports: ExportReport[]): QuestionAggregate[] {
  const map = new Map<string, {
    itemIndex: number;
    itemName: string;
    questionIndex: number;
    questionText: string;
    attempts: number;
    correctCount: number;
    timeSum: number;
    timeCount: number;
    pointsSum: number;
    pointsCount: number;
  }>();

  reports.forEach((report) => {
    (report.data?.itemResults ?? []).forEach((item) => {
      (item.questionAnswers ?? []).forEach((question) => {
        const questionIndex = question.questionIndex ?? 0;
        const key = `${item.itemIndex}-${questionIndex}-${question.questionText || ''}`;
        const current = map.get(key) ?? {
          itemIndex: item.itemIndex,
          itemName: item.itemName || `תחנה ${item.itemIndex + 1}`,
          questionIndex,
          questionText: question.questionText || `שאלה ${questionIndex + 1}`,
          attempts: 0,
          correctCount: 0,
          timeSum: 0,
          timeCount: 0,
          pointsSum: 0,
          pointsCount: 0,
        };

        current.attempts += 1;
        if (question.isCorrect) current.correctCount += 1;
        if (typeof question.timeSpentMs === 'number' && question.timeSpentMs > 0) {
          current.timeSum += question.timeSpentMs;
          current.timeCount += 1;
        }
        if (typeof question.pointsEarned === 'number') {
          current.pointsSum += question.pointsEarned;
          current.pointsCount += 1;
        }
        map.set(key, current);
      });
    });
  });

  return [...map.values()]
    .sort((a, b) => a.itemIndex - b.itemIndex || a.questionIndex - b.questionIndex)
    .map((question) => {
      const successRate = question.attempts > 0 ? Math.round((question.correctCount / question.attempts) * 100) : 0;
      const avgTimeMs = Math.round(question.timeCount > 0 ? question.timeSum / question.timeCount : 0);
      return {
        itemIndex: question.itemIndex,
        itemName: question.itemName,
        questionIndex: question.questionIndex,
        questionText: question.questionText,
        attempts: question.attempts,
        correctCount: question.correctCount,
        successRate,
        avgTimeMs,
        avgTimeLabel: formatDuration(avgTimeMs),
        avgPoints: Math.round(question.pointsCount > 0 ? question.pointsSum / question.pointsCount : 0),
        risk: pctTone(successRate),
      };
    });
}

function buildGroups(participants: ParticipantRow[]): GroupAggregate[] {
  const map = new Map<string, {
    group: string;
    members: ParticipantRow[];
  }>();

  participants.forEach((participant) => {
    const group = participant.group || 'ללא קבוצה';
    const current = map.get(group) ?? { group, members: [] };
    current.members.push(participant);
    map.set(group, current);
  });

  return [...map.values()]
    .map(({ group, members }) => {
      const completed = members.filter((member) => member.status === 'completed').length;
      const inProgress = members.filter((member) => member.status === 'in_progress').length;
      const joinedOnly = members.filter((member) => member.status === 'joined').length;
      const durations = members.map((member) => member.durationMs).filter((value) => value > 0);
      const avgDurationMs = Math.round(average(durations));
      return {
        group,
        memberCount: members.length,
        completedCount: completed,
        inProgressCount: inProgress,
        joinedOnlyCount: joinedOnly,
        completionRate: members.length > 0 ? Math.round((completed / members.length) * 100) : 0,
        avgScore: Math.round(average(members.map((member) => member.normalizedScore))),
        avgProgressPct: Math.round(average(members.map((member) => member.progressPct))),
        avgDurationMs,
        avgDurationLabel: formatDuration(avgDurationMs),
        topScore: Math.max(0, ...members.map((member) => member.normalizedScore)),
        followUpCount: members.filter((member) => member.status !== 'completed' && member.progressPct < 80).length,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

function buildScoreBuckets(scores: number[]) {
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    min: index * 10,
    max: index === 9 ? 100 : index * 10 + 9,
    count: 0,
  }));
  scores.forEach((score) => {
    const index = Math.min(9, Math.max(0, Math.floor(score / 10)));
    buckets[index].count += 1;
  });
  return buckets.map((bucket) => ({ range: `${bucket.min}-${bucket.max}`, count: bucket.count }));
}

function buildRecommendations(
  stats: Omit<ExportStats, 'recommendations'>,
  _activity: ExportActivity,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const riskiestItem = [...stats.items].sort((a, b) => {
    const riskA = (100 - a.completionRate) * 2 + Math.max(0, 70 - a.scoreRate) + a.hintUsageRate;
    const riskB = (100 - b.completionRate) * 2 + Math.max(0, 70 - b.scoreRate) + b.hintUsageRate;
    return riskB - riskA;
  })[0];

  if (stats.totalParticipants === 0) {
    recommendations.push({
      severity: 'בינונית',
      topic: 'אין נתוני משתתפים',
      insight: 'הפעילות עדיין לא צברה מספיק נתונים לדוח מנהלים.',
      action: 'להפעיל את הפעילות או לייבא משתתפים לפני שליחה ללקוח.',
      metric: '0 משתתפים',
      tone: 'amber',
    });
    return recommendations;
  }

  if (stats.completionRate < 70) {
    recommendations.push({
      severity: 'גבוהה',
      topic: 'שיעור סיום נמוך',
      insight: `רק ${stats.completionRate}% מהמשתתפים סיימו את הפעילות.`,
      action: 'לבדוק את התחנה עם הנשירה הגבוהה ביותר ולשלוח תזכורת למי שעדיין בתהליך.',
      metric: `${stats.completedCount}/${stats.totalParticipants} סיימו`,
      tone: 'red',
    });
  }

  if (stats.inProgressCount > 0) {
    recommendations.push({
      severity: 'בינונית',
      topic: 'משתתפים תקועים בתהליך',
      insight: `${stats.inProgressCount} משתתפים התחילו ועדיין לא השלימו.`,
      action: 'לשלוח פולו-אפ ממוקד או לפתוח חלון השלמה נוסף אחרי האירוע.',
      metric: `${stats.inProgressCount} בתהליך`,
      tone: 'blue',
    });
  }

  if (riskiestItem && (riskiestItem.completionRate < 82 || riskiestItem.hintUsageRate > 30 || riskiestItem.scoreRate < 65)) {
    recommendations.push({
      severity: riskiestItem.risk === 'red' ? 'גבוהה' : 'בינונית',
      topic: 'תחנה שדורשת טיפול',
      insight: `"${riskiestItem.itemName}" מציגה ${riskiestItem.completionRate}% השלמה, ${riskiestItem.scoreRate}% הצלחה ו-${riskiestItem.hintUsageRate}% שימוש ברמזים.`,
      action: 'לקצר את ההוראות, להוסיף דוגמה בתחילת התחנה או לשפר את הרמזים.',
      metric: `${riskiestItem.completedCount}/${riskiestItem.reachedCount} השלימו`,
      tone: riskiestItem.risk,
    });
  }

  const sortedGroups = [...stats.groups].sort((a, b) => b.avgScore - a.avgScore);
  if (sortedGroups.length >= 2) {
    const top = sortedGroups[0];
    const bottom = sortedGroups[sortedGroups.length - 1];
    const gap = Math.round(top.avgScore - bottom.avgScore);
    if (gap >= 12) {
      recommendations.push({
        severity: 'בינונית',
        topic: 'פער בין קבוצות',
        insight: `${top.group} מובילה על ${bottom.group} בפער של ${gap} נקודות.`,
        action: 'להשתמש בפער הזה בתחקיר ולבדוק אם הקבוצה החלשה פספסה תחנה או קיבלה פחות זמן.',
        metric: `${top.avgScore} מול ${bottom.avgScore}`,
        tone: 'amber',
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'חיובי',
      topic: 'מוכן להצגה ללקוח',
      insight: 'ההשלמה, הציונים וקצב ההתקדמות נמצאים בטווח טוב להצגת סיכום מנהלים.',
      action: 'לייצא את הדוח המלא ולצרף אותו לסיכום האירוע.',
      metric: `סיום ${stats.completionRate}% | ציון ${stats.avgScore}`,
      tone: 'green',
    });
  }

  return recommendations.slice(0, 6);
}

function buildStats(activity: ExportActivity, reports: ExportReport[]): ExportStats {
  const totalItemsInModule = getTotalItems(activity, reports);
  const rawScoresAll = reports.map((report) => getReportScore(report)).filter((score) => score > 0);
  const scoreCeiling = resolveCeiling(reports, rawScoresAll);
  const passThreshold = resolvePassThreshold(activity.passThreshold);
  const participants = buildParticipants(reports, totalItemsInModule, scoreCeiling, passThreshold);
  const scoredParticipants = participants.filter((participant) => participant.totalScore > 0);
  const scores = scoredParticipants.map((participant) => participant.normalizedScore);
  const durations = participants.map((participant) => participant.durationMs).filter((duration) => duration > 0);
  const completedCount = participants.filter((participant) => participant.status === 'completed').length;
  const inProgressCount = participants.filter((participant) => participant.status === 'in_progress').length;
  const joinedOnlyCount = participants.filter((participant) => participant.status === 'joined').length;
  const passRate = passThreshold === null
    ? null
    : scores.length > 0 ? Math.round((scores.filter((score) => score >= passThreshold).length / scores.length) * 100) : 0;
  const avgProgressPct = Math.round(average(participants.map((participant) => participant.progressPct)));
  const completionRate = participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0;
  const items = buildItems(reports, participants.length);
  const groups = buildGroups(participants);
  const statsWithoutRecommendations = {
    participants,
    items,
    questions: buildQuestions(reports),
    groups,
    totalParticipants: participants.length,
    completedCount,
    inProgressCount,
    joinedOnlyCount,
    completionRate,
    avgScore: Math.round(average(scores)),
    medianScore: Math.round(median(scores)),
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    passRate,
    passThreshold,
    maxPossibleScore: scoreCeiling,
    avgDurationMs: Math.round(average(durations)),
    medianDurationMs: Math.round(median(durations)),
    fastestMs: durations.length > 0 ? Math.min(...durations) : 0,
    slowestMs: durations.length > 0 ? Math.max(...durations) : 0,
    totalItemsInModule,
    avgProgressPct,
    scoreBuckets: buildScoreBuckets(scores),
  };

  return {
    ...statsWithoutRecommendations,
    recommendations: buildRecommendations(statsWithoutRecommendations, activity),
  };
}

function configureWorksheet(worksheet: ExcelJS.Worksheet, freezeRows = 1) {
  worksheet.views = [{ rightToLeft: true, state: 'frozen', ySplit: freezeRows } as ExcelJS.WorksheetView];
  worksheet.properties.defaultRowHeight = 22;
}

function addTitle(worksheet: ExcelJS.Worksheet, title: string, subtitle: string, columns: number) {
  worksheet.mergeCells(1, 1, 1, columns);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dark } };
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: COLORS.white } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells(2, 1, 2, columns);
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSoft } };
  subtitleCell.font = { name: 'Arial', size: 10, color: { argb: COLORS.slate } };
  subtitleCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(2).height = 24;
}

function styleRangeBorder(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let col = fromCol; col <= toCol; col += 1) {
      worksheet.getCell(row, col).border = THIN_BORDER;
    }
  }
}

function addKpi(
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  label: string,
  value: string | number,
  note: string,
  tone: Tone,
) {
  worksheet.mergeCells(row, col, row, col + 1);
  worksheet.mergeCells(row + 1, col, row + 1, col + 1);
  worksheet.mergeCells(row + 2, col, row + 2, col + 1);

  const labelCell = worksheet.getCell(row, col);
  const valueCell = worksheet.getCell(row + 1, col);
  const noteCell = worksheet.getCell(row + 2, col);
  [labelCell, valueCell, noteCell].forEach((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toneSoftColor(tone) } };
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  });
  labelCell.value = label;
  labelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: toneColor(tone) } };
  valueCell.value = value;
  valueCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: COLORS.dark } };
  noteCell.value = note;
  noteCell.font = { name: 'Arial', size: 9, color: { argb: COLORS.slate } };
}

function addSectionHeader(worksheet: ExcelJS.Worksheet, row: number, title: string, columns: number) {
  worksheet.mergeCells(row, 1, row, columns);
  const cell = worksheet.getCell(row, 1);
  cell.value = title;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueSoft } };
  cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.dark } };
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.border = THIN_BORDER;
  worksheet.getRow(row).height = 24;
}

function addTable<T>(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  columns: TableColumn<T>[],
  rows: T[],
  _tableName: string,
) {
  columns.forEach((column, index) => {
    const sheetColumn = worksheet.getColumn(index + 1);
    sheetColumn.width = Math.max(sheetColumn.width ?? 0, column.width ?? 16);
  });

  if (rows.length === 0) {
    worksheet.getCell(startRow, 1).value = 'אין נתונים להצגה';
    worksheet.getCell(startRow, 1).font = { name: 'Arial', italic: true, color: { argb: COLORS.slate } };
    return startRow + 1;
  }

  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 24;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dark } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  rows.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(startRow + rowIndex + 1);
    row.height = 22;
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = column.value(rowData);
      cell.font = { name: 'Arial', size: 10, color: { argb: COLORS.dark } };
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      cell.border = THIN_BORDER;
      if (rowIndex % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7FAFC' } };
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: columns.length },
  };
  return startRow + rows.length + 2;
}

function stylePercentColumn(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  columnNumber: number,
  dataLength: number,
) {
  for (let row = headerRow + 1; row <= headerRow + dataLength; row += 1) {
    const cell = worksheet.getCell(row, columnNumber);
    const value = numberOrZero(cell.value);
    const tone = pctTone(value);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toneSoftColor(tone) } };
    cell.font = { name: 'Arial', bold: true, color: { argb: toneColor(tone) } };
  }
}

function addSummarySheet(workbook: ExcelJS.Workbook, activity: ExportActivity, stats: ExportStats, exportType: AnalyticsExportType, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'תקציר מנהלים' + nameSuffix);
  addTitle(
    worksheet,
    `${EXPORT_LABELS[exportType]} - ${activity.name}`,
    `קוד פעילות: ${activity.code} | סטטוס: ${activity.status} | נוצר: ${formatDate(new Date())}`,
    10,
  );

  const passRateText = stats.passRate === null ? 'ללא' : `${stats.passRate}%`;
  const passRateTone: Tone = stats.passRate === null ? 'slate' : pctTone(stats.passRate);
  const passGradeNote = stats.passThreshold === null
    ? 'לא הוגדר ציון מעבר לפעילות.'
    : `משתתפים עם ציון מנורמל ${stats.passThreshold} ומעלה`;

  worksheet.columns = Array.from({ length: 10 }, () => ({ width: 16 }));
  addKpi(worksheet, 4, 1, 'משתתפים', stats.totalParticipants, `${stats.completedCount} סיימו`, 'blue');
  addKpi(worksheet, 4, 3, 'אחוז סיום', `${stats.completionRate}%`, `${stats.inProgressCount} עדיין בתהליך`, pctTone(stats.completionRate));
  addKpi(worksheet, 4, 5, 'ציון ממוצע (0-100)', stats.avgScore, `חציון ${stats.medianScore} | מעבר ${passRateText}`, pctTone(stats.avgScore));
  addKpi(worksheet, 4, 7, 'זמן ממוצע', formatDuration(stats.avgDurationMs) || '-', `חציון ${formatDuration(stats.medianDurationMs) || '-'}`, 'amber');
  addKpi(worksheet, 4, 9, 'התקדמות ממוצעת', `${stats.avgProgressPct}%`, `${stats.totalItemsInModule} תחנות במסלול`, pctTone(stats.avgProgressPct));

  addKpi(worksheet, 8, 1, 'המהיר ביותר', formatDuration(stats.fastestMs) || '-', `הארוך ביותר ${formatDuration(stats.slowestMs) || '-'}`, 'green');
  addKpi(worksheet, 8, 3, 'ציון גבוה (0-100)', stats.highestScore, `נמוך ${stats.lowestScore}`, 'green');
  addKpi(worksheet, 8, 5, 'אחוז מעבר', passRateText, passGradeNote, passRateTone);
  addKpi(worksheet, 8, 7, 'תחנות', stats.totalItemsInModule, `${stats.items.length} עם נתוני ביצוע`, 'slate');
  addKpi(worksheet, 8, 9, 'מודול', activity.module?.type || '-', activity.connectionType === 'group' ? 'פעילות קבוצתית' : 'פעילות אישית', 'blue');

  addSectionHeader(worksheet, 13, 'תמונת מצב', 10);
  addTable(
    worksheet,
    14,
    [
      { header: 'מדד', width: 24, value: (row: { label: string; value: string | number }) => row.label },
      { header: 'ערך', width: 18, value: (row) => row.value },
      { header: 'פירוש ללקוח', width: 48, value: (row: { note: string }) => row.note },
    ],
    [
      { label: 'הושלם', value: stats.completedCount, note: 'מספר המשתתפים שעברו את כל הפעילות.' },
      { label: 'בתהליך', value: stats.inProgressCount, note: 'משתתפים שכדאי לשלוח אליהם תזכורת.' },
      { label: 'נכנסו בלבד', value: stats.joinedOnlyCount, note: 'נכנסו אך לא התחילו מסלול משמעותי.' },
      { label: 'אחוז מעבר', value: passRateText, note: stats.passThreshold === null ? 'לא הוגדר ציון מעבר לפעילות.' : `משתתפים עם ציון מנורמל ${stats.passThreshold} ומעלה (מתוך 100).` },
      { label: 'התקדמות ממוצעת', value: `${stats.avgProgressPct}%`, note: 'כמה מהמסלול נצרך בפועל בממוצע.' },
    ],
    'SummaryStatusTable',
  );

  addSectionHeader(worksheet, 22, 'המלצות מרכזיות', 10);
  addTable(
    worksheet,
    23,
    [
      { header: 'חומרה', width: 14, value: (row: Recommendation) => row.severity },
      { header: 'נושא', width: 24, value: (row) => row.topic },
      { header: 'תובנה', width: 55, value: (row) => row.insight },
      { header: 'פעולה מומלצת', width: 58, value: (row) => row.action },
      { header: 'נתון תומך', width: 22, value: (row) => row.metric },
    ],
    stats.recommendations,
    'SummaryRecommendationsTable',
  );

  const topParticipants = [...stats.participants].sort((a, b) => a.rank - b.rank).slice(0, 10);
  addSectionHeader(worksheet, 32, 'מובילי הפעילות', 10);
  addTable(
    worksheet,
    33,
    [
      { header: 'דירוג', width: 10, value: (row: ParticipantRow) => row.rank },
      { header: 'שם', width: 22, value: (row) => row.name },
      { header: 'קבוצה', width: 18, value: (row) => row.group },
      { header: 'ציון (0-100)', width: 12, value: (row) => row.normalizedScore },
      { header: 'משך', width: 16, value: (row) => row.durationLabel },
      { header: 'התקדמות', width: 14, value: (row) => `${row.progressPct}%` },
    ],
    topParticipants,
    'SummaryTopParticipantsTable',
  );

  configureWorksheet(worksheet, 2);
  styleRangeBorder(worksheet, 4, 10, 1, 10);
}

function addParticipantsSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'משתתפים' + nameSuffix);
  addTitle(worksheet, 'משתתפים - פרטי קשר, סטטוס ודירוג', 'מי שיחק, מי סיים, מי צריך פולו-אפ ומה הציון שלו.', 17);
  const headerRow = 4;
  addTable(
    worksheet,
    headerRow,
    [
      { header: '#', width: 8, value: (row: ParticipantRow) => row.index },
      { header: 'דירוג', width: 10, value: (row) => row.rank },
      { header: 'שם', width: 22, value: (row) => row.name },
      { header: 'אימייל', width: 30, value: (row) => row.email },
      { header: 'טלפון', width: 18, value: (row) => row.phone },
      { header: 'קבוצה', width: 20, value: (row) => row.group },
      { header: 'סטטוס', width: 16, value: (row) => row.statusLabel },
      { header: 'ציון (0-100)', width: 12, value: (row) => row.normalizedScore },
      { header: 'עבר/לא עבר', width: 14, value: (row) => row.passLabel },
      { header: 'התקדמות %', width: 14, value: (row) => row.progressPct },
      { header: 'תחנות שהושלמו', width: 16, value: (row) => row.itemsCompleted },
      { header: 'סה"כ תחנות', width: 14, value: (row) => row.totalItems },
      { header: 'תחנה אחרונה', width: 14, value: (row) => row.lastActiveItem },
      { header: 'משך', width: 18, value: (row) => row.durationLabel },
      { header: 'הצטרפות', width: 22, value: (row) => row.joinedAt },
      { header: 'סיום', width: 22, value: (row) => row.completedAt },
    ],
    stats.participants,
    'ParticipantsTable',
  );
  stylePercentColumn(worksheet, headerRow, 8, stats.participants.length);
  stylePercentColumn(worksheet, headerRow, 10, stats.participants.length);
  configureWorksheet(worksheet);
}

function addScoresSheet(workbook: ExcelJS.Workbook, reports: ExportReport[], stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'ציונים' + nameSuffix);
  addTitle(worksheet, 'ציונים - סיכום וכל תחנה', 'פירוט ציון כולל לצד ציוני תחנות ומשחקים לכל משתתף.', 10);

  const itemNames = [...stats.items].sort((a, b) => a.itemIndex - b.itemIndex);
  const legacyGameNames = [
    ...new Set(
      reports.flatMap((report) => (report.data?.scores ?? []).map((score) => score.gameName).filter(Boolean)),
    ),
  ].filter((gameName) => !itemNames.some((item) => item.itemName === gameName));
  const rows = stats.participants.map((participant) => {
    const report = reports[participant.index - 1];
    const itemMap = new Map((report.data?.itemResults ?? []).map((item) => [item.itemIndex, item]));
    const scoreMap = new Map((report.data?.scores ?? []).map((score) => [score.gameName, score.score]));
    return { participant, itemMap, scoreMap };
  });
  const columns: TableColumn<{
    participant: ParticipantRow;
    itemMap: Map<number, ExportItemResult>;
    scoreMap: Map<string, number>;
  }>[] = [
    { header: 'דירוג', width: 10, value: (row) => row.participant.rank },
    { header: 'שם', width: 22, value: (row) => row.participant.name },
    { header: 'קבוצה', width: 18, value: (row) => row.participant.group },
    { header: 'סטטוס', width: 15, value: (row) => row.participant.statusLabel },
    { header: 'ציון (0-100)', width: 13, value: (row) => row.participant.normalizedScore },
    { header: 'עבר/לא עבר', width: 14, value: (row) => row.participant.passLabel },
    { header: 'משך', width: 16, value: (row) => row.participant.durationLabel },
    ...itemNames.map((item) => ({
      header: `${item.itemIndex + 1}. ${item.itemName} (0-100)`,
      width: 24,
      value: (row: { participant: ParticipantRow; itemMap: Map<number, ExportItemResult> }) => {
        const itemResult = row.itemMap.get(item.itemIndex);
        if (!itemResult) return '';
        const score = itemResult.score ?? 0;
        const max = itemResult.maxPossibleScore ?? 0;
        return max > 0 ? Math.round((score / max) * 100) : score;
      },
    })),
    ...legacyGameNames.map((gameName) => ({
      header: gameName,
      width: 24,
      value: (row: { scoreMap: Map<string, number> }) => row.scoreMap.get(gameName) ?? '',
    })),
  ];
  addTable(worksheet, 4, columns, rows, 'ScoresTable');
  configureWorksheet(worksheet);
}

function addProgressSheet(workbook: ExcelJS.Workbook, reports: ExportReport[], stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'התקדמות' + nameSuffix);
  addTitle(worksheet, 'התקדמות - איפה כל משתתף נמצא', 'שימושי במיוחד למנהלים שרוצים להבין מי נתקע ובאיזו תחנה.', 12);
  const itemNames = [...stats.items].sort((a, b) => a.itemIndex - b.itemIndex);
  const rows = stats.participants.map((participant) => {
    const report = reports[participant.index - 1];
    const itemMap = new Map((report.data?.itemResults ?? []).map((item) => [item.itemIndex, item]));
    return { participant, itemMap };
  });
  const columns: TableColumn<{ participant: ParticipantRow; itemMap: Map<number, ExportItemResult> }>[] = [
    { header: 'שם', width: 22, value: (row) => row.participant.name },
    { header: 'קבוצה', width: 18, value: (row) => row.participant.group },
    { header: 'סטטוס', width: 15, value: (row) => row.participant.statusLabel },
    { header: 'התקדמות %', width: 14, value: (row) => row.participant.progressPct },
    { header: 'תחנות שהושלמו', width: 16, value: (row) => row.participant.itemsCompleted },
    { header: 'תחנה אחרונה', width: 14, value: (row) => row.participant.lastActiveItem },
    { header: 'משך', width: 16, value: (row) => row.participant.durationLabel },
    ...itemNames.map((item) => ({
      header: `${item.itemIndex + 1}. ${item.itemName}`,
      width: 22,
      value: (row: { participant: ParticipantRow; itemMap: Map<number, ExportItemResult> }) => {
        const itemResult = row.itemMap.get(item.itemIndex);
        if (!itemResult) return 'לא הגיע';
        return itemResult.completedAt ? 'הושלם' : 'התחיל';
      },
    })),
  ];
  addTable(worksheet, 4, columns, rows, 'ProgressTable');
  stylePercentColumn(worksheet, 4, 4, rows.length);
  configureWorksheet(worksheet);
}

function addItemsSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'תחנות' + nameSuffix);
  addTitle(worksheet, 'תחנות ומשחקים - ביצועים וסיכונים', 'מזהה צווארי בקבוק, שימוש ברמזים, זמני פתרון וציוני תחנות.', 13);
  const headerRow = 4;
  addTable(
    worksheet,
    headerRow,
    [
      { header: '#', width: 8, value: (row: ItemAggregate) => row.itemIndex + 1 },
      { header: 'שם תחנה', width: 28, value: (row) => row.itemName },
      { header: 'סוג', width: 16, value: (row) => row.itemType },
      { header: 'סוג משחק', width: 16, value: (row) => row.gameType },
      { header: 'הגיעו', width: 12, value: (row) => row.reachedCount },
      { header: 'שיעור הגעה', width: 14, value: (row) => row.reachRate },
      { header: 'השלימו', width: 12, value: (row) => row.completedCount },
      { header: 'השלמה %', width: 14, value: (row) => row.completionRate },
      { header: 'ציון ממוצע (0-100)', width: 16, value: (row) => row.scoreRate },
      { header: 'זמן ממוצע', width: 18, value: (row) => row.avgDurationLabel },
      { header: 'שימוש ברמז %', width: 16, value: (row) => row.hintUsageRate },
      { header: 'רמת סיכון', width: 14, value: (row) => row.risk === 'red' ? 'גבוהה' : row.risk === 'amber' ? 'בינונית' : 'נמוכה' },
    ],
    stats.items,
    'ItemsTable',
  );
  stylePercentColumn(worksheet, headerRow, 8, stats.items.length);
  stylePercentColumn(worksheet, headerRow, 9, stats.items.length);
  configureWorksheet(worksheet);
}

function addQuestionsSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'שאלות' + nameSuffix);
  addTitle(worksheet, 'שאלות - ניתוח הצלחה וזמן', 'פירוט שאלות במשחקים מבוססי שאלות, כולל שאלות קשות וזמני מענה.', 10);
  const headerRow = 4;
  addTable(
    worksheet,
    headerRow,
    [
      { header: 'תחנה', width: 24, value: (row: QuestionAggregate) => row.itemName },
      { header: '# שאלה', width: 10, value: (row) => row.questionIndex + 1 },
      { header: 'שאלה', width: 54, value: (row) => row.questionText },
      { header: 'ניסיונות', width: 12, value: (row) => row.attempts },
      { header: 'נכונים', width: 12, value: (row) => row.correctCount },
      { header: 'הצלחה %', width: 12, value: (row) => row.successRate },
      { header: 'זמן ממוצע', width: 16, value: (row) => row.avgTimeLabel },
      { header: 'נקודות ממוצעות', width: 16, value: (row) => row.avgPoints },
      { header: 'אבחון', width: 16, value: (row) => row.risk === 'red' ? 'קשה מדי' : row.risk === 'amber' ? 'דורש בדיקה' : 'תקין' },
    ],
    stats.questions,
    'QuestionsTable',
  );
  stylePercentColumn(worksheet, headerRow, 6, stats.questions.length);
  configureWorksheet(worksheet);
}

function addGroupsSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'קבוצות' + nameSuffix);
  addTitle(worksheet, 'קבוצות - השוואת ביצועים', 'השוואת צוותים לפי ציון, השלמה, זמן ומשתתפים שדורשים פולו-אפ.', 12);
  const headerRow = 4;
  addTable(
    worksheet,
    headerRow,
    [
      { header: 'קבוצה', width: 24, value: (row: GroupAggregate) => row.group },
      { header: 'משתתפים', width: 12, value: (row) => row.memberCount },
      { header: 'הושלם', width: 12, value: (row) => row.completedCount },
      { header: 'בתהליך', width: 12, value: (row) => row.inProgressCount },
      { header: 'נכנסו בלבד', width: 14, value: (row) => row.joinedOnlyCount },
      { header: 'אחוז סיום', width: 14, value: (row) => row.completionRate },
      { header: 'ציון ממוצע (0-100)', width: 16, value: (row) => row.avgScore },
      { header: 'התקדמות ממוצעת', width: 18, value: (row) => row.avgProgressPct },
      { header: 'זמן ממוצע', width: 18, value: (row) => row.avgDurationLabel },
      { header: 'ציון מוביל (0-100)', width: 16, value: (row) => row.topScore },
      { header: 'דורשים פולו-אפ', width: 16, value: (row) => row.followUpCount },
    ],
    stats.groups,
    'GroupsTable',
  );
  stylePercentColumn(worksheet, headerRow, 6, stats.groups.length);
  stylePercentColumn(worksheet, headerRow, 8, stats.groups.length);
  configureWorksheet(worksheet);
}

function addOrderSurveySheet(workbook: ExcelJS.Workbook, reports: ExportReport[], nameSuffix = '') {
  const surveyRows: {
    itemIndex: number;
    itemName: string;
    participant: string;
    ranking: string[];
    items: string[];
  }[] = [];

  reports.forEach((report) => {
    (report.data?.itemResults ?? []).forEach((item) => {
      const meta = item.metadata;
      if (!meta || meta.orderSurvey !== true || !Array.isArray(meta.ranking)) return;
      surveyRows.push({
        itemIndex: item.itemIndex ?? 0,
        itemName: item.itemName || `תחנה ${(item.itemIndex ?? 0) + 1}`,
        participant: report.participantName,
        ranking: meta.ranking as string[],
        items: Array.isArray(meta.items) ? (meta.items as string[]) : (meta.ranking as string[]),
      });
    });
  });

  if (surveyRows.length === 0) return;

  const worksheet = addSheet(workbook, 'סקר דירוג' + nameSuffix);
  addTitle(worksheet, 'סקר דירוג — דירוגים אישיים', 'טבלת דירוג אישית לכל משתתף במשחקי סדר במצב סקר.', 12);

  const itemGroups = new Map<number, typeof surveyRows>();
  surveyRows.forEach((row) => {
    const list = itemGroups.get(row.itemIndex) ?? [];
    list.push(row);
    itemGroups.set(row.itemIndex, list);
  });

  let rowPtr = 4;
  [...itemGroups.entries()].sort((a, b) => a[0] - b[0]).forEach(([itemIndex, rows]) => {
    const itemName = rows[0]?.itemName || `תחנה ${itemIndex + 1}`;
    const maxRanks = Math.max(...rows.map((r) => r.ranking.length), 0);
    worksheet.getCell(rowPtr, 1).value = `${itemIndex + 1}. ${itemName}`;
    worksheet.getCell(rowPtr, 1).font = { bold: true, size: 13 };
    rowPtr += 1;

    const headers = ['שם', ...Array.from({ length: maxRanks }, (_, i) => `דירוג ${i + 1}`)];
    headers.forEach((h, col) => {
      const cell = worksheet.getCell(rowPtr, col + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.border = THIN_BORDER;
    });
    rowPtr += 1;

    rows.forEach((r) => {
      worksheet.getCell(rowPtr, 1).value = r.participant;
      r.ranking.forEach((val, i) => {
        worksheet.getCell(rowPtr, i + 2).value = val;
      });
      rowPtr += 1;
    });
    rowPtr += 2;
  });

  configureWorksheet(worksheet);
}

function ratingColor(value: number): string {
  if (value >= 5) return COLORS.green;
  if (value >= 4) return COLORS.blue;
  if (value >= 3) return COLORS.amber;
  return COLORS.red;
}

interface FeedbackAnswer {
  questionIndex: number;
  questionText: string;
  value: number;
  label: string;
}

function addFeedbackSheet(workbook: ExcelJS.Workbook, reports: ExportReport[], nameSuffix = '') {
  interface FbRow {
    itemIndex: number;
    itemName: string;
    participant: string;
    answers: FeedbackAnswer[];
    notes: string;
    averageRating: number;
  }
  const rows: FbRow[] = [];
  reports.forEach((report) => {
    (report.data?.itemResults ?? []).forEach((item) => {
      const meta = item.metadata;
      if (!meta || meta.feedbackType !== 'rating_6_level' || !Array.isArray(meta.answers)) return;
      rows.push({
        itemIndex: item.itemIndex ?? 0,
        itemName: item.itemName || `תחנה ${(item.itemIndex ?? 0) + 1}`,
        participant: report.participantName || 'ללא שם',
        answers: (meta.answers as FeedbackAnswer[]).filter((a) => a && typeof a.value === 'number'),
        notes: typeof meta.notes === 'string' ? meta.notes : '',
        averageRating: typeof meta.averageRating === 'number' ? meta.averageRating : 0,
      });
    });
  });

  if (rows.length === 0) return;

  const worksheet = addSheet(workbook, 'משוב' + nameSuffix);
  addTitle(
    worksheet,
    'משוב — דירוגים וחוות דעת',
    'תשובות המשתתפים בתחנות המשוב: דירוג לכל שאלה (1-6), ממוצע וטקסט חופשי.',
    12,
  );
  worksheet.getColumn(1).width = 26;
  for (let col = 2; col <= 14; col += 1) worksheet.getColumn(col).width = 24;

  const groups = new Map<number, FbRow[]>();
  rows.forEach((row) => {
    const list = groups.get(row.itemIndex) ?? [];
    list.push(row);
    groups.set(row.itemIndex, list);
  });

  let rowPtr = 4;
  [...groups.entries()].sort((a, b) => a[0] - b[0]).forEach(([itemIndex, groupRows]) => {
    const itemName = groupRows[0]?.itemName || `תחנה ${itemIndex + 1}`;

    const questionMap = new Map<number, string>();
    groupRows.forEach((r) => r.answers.forEach((a) => {
      if (!questionMap.has(a.questionIndex)) {
        questionMap.set(a.questionIndex, a.questionText || `שאלה ${a.questionIndex + 1}`);
      }
    }));
    const questions = [...questionMap.entries()].sort((a, b) => a[0] - b[0]);

    const titleCell = worksheet.getCell(rowPtr, 1);
    titleCell.value = `${itemIndex + 1}. ${itemName}  (${groupRows.length} תשובות)`;
    titleCell.font = { name: 'Arial', bold: true, size: 13, color: { argb: COLORS.dark } };
    rowPtr += 2;

    addSectionHeader(worksheet, rowPtr, 'ממוצע דירוג לכל שאלה (1-6)', Math.max(3, questions.length + 1));
    rowPtr += 1;
    questions.forEach(([qIndex, qText]) => {
      const ratings = groupRows
        .map((r) => r.answers.find((a) => a.questionIndex === qIndex)?.value)
        .filter((v): v is number => typeof v === 'number');
      const avg = ratings.length > 0 ? +(ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(2) : 0;
      worksheet.getCell(rowPtr, 1).value = qText;
      worksheet.getCell(rowPtr, 1).font = { name: 'Arial', size: 10 };
      const avgCell = worksheet.getCell(rowPtr, 2);
      avgCell.value = avg;
      avgCell.font = { name: 'Arial', bold: true, color: { argb: ratingColor(avg) } };
      worksheet.getCell(rowPtr, 3).value = `${ratings.length} תשובות`;
      worksheet.getCell(rowPtr, 3).font = { name: 'Arial', size: 9, color: { argb: COLORS.slate } };
      rowPtr += 1;
    });
    rowPtr += 1;

    const headers = ['שם', ...questions.map(([, text]) => text), 'ממוצע', 'הערות'];
    const headerRowObj = worksheet.getRow(rowPtr);
    headers.forEach((header, idx) => {
      const cell = headerRowObj.getCell(idx + 1);
      cell.value = header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dark } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } };
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      cell.border = THIN_BORDER;
    });
    rowPtr += 1;

    groupRows.forEach((r) => {
      const dataRow = worksheet.getRow(rowPtr);
      let col = 1;
      const nameCell = dataRow.getCell(col);
      nameCell.value = r.participant;
      nameCell.font = { name: 'Arial', size: 10 };
      nameCell.border = THIN_BORDER;
      col += 1;
      questions.forEach(([qIndex]) => {
        const ans = r.answers.find((a) => a.questionIndex === qIndex);
        const cell = dataRow.getCell(col);
        cell.value = ans ? `${ans.value} – ${ans.label}` : '';
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { horizontal: 'right', wrapText: true };
        cell.border = THIN_BORDER;
        col += 1;
      });
      const avgCell = dataRow.getCell(col);
      avgCell.value = r.averageRating;
      avgCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: ratingColor(r.averageRating) } };
      avgCell.border = THIN_BORDER;
      col += 1;
      const notesCell = dataRow.getCell(col);
      notesCell.value = r.notes;
      notesCell.font = { name: 'Arial', size: 10 };
      notesCell.alignment = { horizontal: 'right', wrapText: true };
      notesCell.border = THIN_BORDER;
      rowPtr += 1;
    });
    rowPtr += 2;
  });

  configureWorksheet(worksheet);
}

function addRecommendationsSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'המלצות' + nameSuffix);
  addTitle(worksheet, 'המלצות ותובנות ללקוח', 'שורות שמוכנות כמעט כמו סיכום מנהלים: מה קרה, למה זה חשוב ומה עושים.', 9);
  addTable(
    worksheet,
    4,
    [
      { header: 'חומרה', width: 14, value: (row: Recommendation) => row.severity },
      { header: 'נושא', width: 24, value: (row) => row.topic },
      { header: 'תובנה', width: 60, value: (row) => row.insight },
      { header: 'פעולה מומלצת', width: 62, value: (row) => row.action },
      { header: 'נתון תומך', width: 24, value: (row) => row.metric },
    ],
    stats.recommendations,
    'RecommendationsTable',
  );
  configureWorksheet(worksheet);
}

function addScoreDistributionSheet(workbook: ExcelJS.Workbook, stats: ExportStats, nameSuffix = '') {
  const worksheet = addSheet(workbook, 'התפלגות' + nameSuffix);
  addTitle(worksheet, 'התפלגות ציונים', 'כמה משתתפים נמצאים בכל טווח ציון מנורמל (0-100).', 4);
  addTable(
    worksheet,
    4,
    [
      { header: 'טווח ציון (0-100)', width: 18, value: (row: { range: string; count: number }) => row.range },
      { header: 'כמות משתתפים', width: 18, value: (row) => row.count },
    ],
    stats.scoreBuckets,
    'ScoreDistributionTable',
  );
  configureWorksheet(worksheet);
}

function addActivityReportSheets(
  workbook: ExcelJS.Workbook,
  activity: ExportActivity,
  reports: ExportReport[],
  exportType: AnalyticsExportType,
  nameSuffix = '',
) {
  const stats = buildStats(activity, reports);
  addSummarySheet(workbook, activity, stats, exportType, nameSuffix);

  if (exportType === 'participants') {
    addParticipantsSheet(workbook, stats, nameSuffix);
    addGroupsSheet(workbook, stats, nameSuffix);
    addProgressSheet(workbook, reports, stats, nameSuffix);
  } else if (exportType === 'scores') {
    addScoresSheet(workbook, reports, stats, nameSuffix);
    addItemsSheet(workbook, stats, nameSuffix);
    addQuestionsSheet(workbook, stats, nameSuffix);
    addScoreDistributionSheet(workbook, stats, nameSuffix);
  } else if (exportType === 'progress') {
    addProgressSheet(workbook, reports, stats, nameSuffix);
    addParticipantsSheet(workbook, stats, nameSuffix);
    addItemsSheet(workbook, stats, nameSuffix);
    addRecommendationsSheet(workbook, stats, nameSuffix);
  } else {
    addParticipantsSheet(workbook, stats, nameSuffix);
    addScoresSheet(workbook, reports, stats, nameSuffix);
    addProgressSheet(workbook, reports, stats, nameSuffix);
    addItemsSheet(workbook, stats, nameSuffix);
    addQuestionsSheet(workbook, stats, nameSuffix);
    addGroupsSheet(workbook, stats, nameSuffix);
    addScoreDistributionSheet(workbook, stats, nameSuffix);
    addRecommendationsSheet(workbook, stats, nameSuffix);
  }

  addOrderSurveySheet(workbook, reports, nameSuffix);
  addFeedbackSheet(workbook, reports, nameSuffix);
}

function applyLandscapePageSetup(workbook: ExcelJS.Workbook) {
  workbook.eachSheet((worksheet) => {
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    };
  });
}

export async function buildAnalyticsWorkbookBuffer(
  activity: ExportActivity,
  reports: ExportReport[],
  exportType: AnalyticsExportType,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YOOZ';
  workbook.lastModifiedBy = 'YOOZ';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.views = [{ x: 0, y: 0, width: 16000, height: 9000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  addActivityReportSheets(workbook, activity, reports, exportType);

  workbook.eachSheet((worksheet) => {
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export interface CombinedReportCardActivityMeta {
  _id: string;
  name: string;
  code: string;
}

export interface CombinedReportCardParticipant {
  key: string;
  name: string;
  email: string;
  phone: string;
  grades: Record<string, number | null>;
  finalGrade: number | null;
  activitiesPlayed: number;
}

export interface CombinedReportCardData {
  activities: CombinedReportCardActivityMeta[];
  participants: CombinedReportCardParticipant[];
  totalParticipants: number;
  avgFinalGrade: number | null;
  period: string;
}

function addCombinedReportCardSheet(workbook: ExcelJS.Workbook, data: CombinedReportCardData) {
  const worksheet = addSheet(workbook, 'דוח משולב');
  const activityCount = data.activities.length;
  const totalCols = 3 + activityCount + 2;

  addTitle(
    worksheet,
    'דוח משולב — ציון סופי לכל משתתף',
    `${activityCount} פעילויות | ${data.totalParticipants} משתתפים | ציון סופי ממוצע ${data.avgFinalGrade ?? '—'} | תקופה: ${data.period}`,
    totalCols,
  );

  type Row = CombinedReportCardParticipant & { index: number };
  const rows: Row[] = data.participants.map((participant, index) => ({ ...participant, index: index + 1 }));

  const columns: TableColumn<Row>[] = [
    { header: '#', width: 8, value: (row) => row.index },
    { header: 'שם', width: 24, value: (row) => row.name || 'ללא שם' },
    { header: 'איש קשר', width: 28, value: (row) => row.email || row.phone || '' },
    ...data.activities.map((activity, index) => ({
      header: `${index + 1}. ${activity.name}`,
      width: 18,
      value: (row: Row) => {
        const grade = row.grades[activity._id];
        return grade === null || grade === undefined ? '—' : grade;
      },
    })),
    { header: 'פעילויות', width: 12, value: (row) => row.activitiesPlayed },
    { header: 'ציון סופי', width: 14, value: (row) => row.finalGrade ?? '—' },
  ];

  const headerRow = 4;
  addTable(worksheet, headerRow, columns, rows, 'CombinedReportCardTable');
  stylePercentColumn(worksheet, headerRow, totalCols, rows.length);
  configureWorksheet(worksheet);
}

export async function buildCombinedReportCardWorkbook(data: CombinedReportCardData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YOOZ';
  workbook.lastModifiedBy = 'YOOZ';
  workbook.created = new Date();
  workbook.modified = new Date();

  addCombinedReportCardSheet(workbook, data);
  applyLandscapePageSetup(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export interface CombinedExportActivity {
  activity: ExportActivity;
  reports: ExportReport[];
}

function addCombinedParticipantsSheet(workbook: ExcelJS.Workbook, perActivity: CombinedExportActivity[]) {
  type Row = ParticipantRow & { activityName: string };
  const rows: Row[] = [];
  perActivity.forEach(({ activity, reports }) => {
    const stats = buildStats(activity, reports);
    stats.participants.forEach((participant) => rows.push({ ...participant, activityName: activity.name }));
  });
  rows.sort((a, b) => (a.activityName === b.activityName ? a.rank - b.rank : a.activityName.localeCompare(b.activityName)));

  const worksheet = addSheet(workbook, 'כל המשתתפים');
  addTitle(worksheet, 'כל המשתתפים — כל הפעילויות', 'כל הדוחות מכל הפעילויות שנבחרו, עם הפעילות והציון המנורמל (0-100).', 11);
  const headerRow = 4;
  addTable(
    worksheet,
    headerRow,
    [
      { header: 'פעילות', width: 24, value: (row: Row) => row.activityName },
      { header: 'שם', width: 22, value: (row) => row.name },
      { header: 'אימייל', width: 28, value: (row) => row.email },
      { header: 'טלפון', width: 18, value: (row) => row.phone },
      { header: 'קבוצה', width: 18, value: (row) => row.group },
      { header: 'סטטוס', width: 14, value: (row) => row.statusLabel },
      { header: 'ציון (0-100)', width: 12, value: (row) => row.normalizedScore },
      { header: 'עבר/לא עבר', width: 12, value: (row) => row.passLabel },
      { header: 'התקדמות %', width: 12, value: (row) => row.progressPct },
      { header: 'משך', width: 16, value: (row) => row.durationLabel },
      { header: 'הצטרפות', width: 20, value: (row) => row.joinedAt },
    ],
    rows,
    'CombinedAllParticipantsTable',
  );
  stylePercentColumn(worksheet, headerRow, 7, rows.length);
  stylePercentColumn(worksheet, headerRow, 9, rows.length);
  configureWorksheet(worksheet);
}

export async function buildCombinedActivitiesWorkbook(
  perActivity: CombinedExportActivity[],
  exportType: AnalyticsExportType,
  reportCard: CombinedReportCardData,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YOOZ';
  workbook.lastModifiedBy = 'YOOZ';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.views = [{ x: 0, y: 0, width: 16000, height: 9000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  addCombinedReportCardSheet(workbook, reportCard);
  addCombinedParticipantsSheet(workbook, perActivity);
  perActivity.forEach((entry, index) => {
    addActivityReportSheets(workbook, entry.activity, entry.reports, exportType, ` ${index + 1}`);
  });

  applyLandscapePageSetup(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
