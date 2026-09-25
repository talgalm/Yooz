import { useState, useEffect, useCallback } from 'react';
import { adminApiFetch } from '../utils/adminApi';
import { useAnalyticsSource } from '../pages/admin/AdminStatisticsTab/analyticsSource';
import type {
  OverviewData,
  TimelinePoint,
  ActivityAnalyticsData,
  FunnelStep,
  ItemStats,
  QuestionStats,
  GroupStats,
  AnomalyAlert,
  AuditLogEntry,
  ActivityPeriod,
  ActivityDay,
  RosterParticipant,
  CombinedReportData,
} from '../pages/admin/AdminStatisticsTab/types';

const selectTimeline = (response: { timeline: TimelinePoint[] }) => response.timeline;
const selectFunnel = (response: { funnel: FunnelStep[] }) => response.funnel;
const selectItems = (response: { items: ItemStats[] }) => response.items;
const selectQuestions = (response: { questions: QuestionStats[] }) => response.questions;
const selectGroups = (response: { groups: GroupStats[] }) => response.groups;
const selectAlerts = (response: { alerts: AnomalyAlert[] }) => response.alerts;
const selectParticipants = (response: { participants: RosterParticipant[] }) => response.participants;
const selectAuditLog = (response: { logs: AuditLogEntry[]; total: number; page: number; totalPages: number }) => ({
  entries: response.logs,
  total: response.total,
  page: response.page,
  pages: response.totalPages,
});

const selectDays = (response: { days: ActivityDay[] }) => response.days;
const selectScheduledReport = (response: { scheduledReport: ScheduledReportSettings }) => response.scheduledReport;

function periodQuery(period?: ActivityPeriod) {
  return period ? `?period=${period}` : '';
}

function useApiFetch<TResponse, TData = TResponse>(
  url: string | null,
  select?: (response: TResponse) => TData,
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch<TResponse>(url);
      setData(select ? select(res) : (res as unknown as TData));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url, select]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useOverview() {
  return useApiFetch<OverviewData>('/api/admin/analytics/overview');
}

export function useTimeline(days = 30) {
  return useApiFetch<{ timeline: TimelinePoint[] }, TimelinePoint[]>(
    `/api/admin/analytics/overview/timeline?days=${days}`,
    selectTimeline,
  );
}

export function useActivityAnalytics(activityId: string | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<ActivityAnalyticsData>(
    activityId ? `${base(activityId)}${periodQuery(period)}` : null,
  );
}

export function useFunnel(activityId: string | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<{ funnel: FunnelStep[] }, FunnelStep[]>(
    activityId ? `${base(activityId)}/funnel${periodQuery(period)}` : null,
    selectFunnel,
  );
}

export function useItemStats(activityId: string | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<{ items: ItemStats[] }, ItemStats[]>(
    activityId ? `${base(activityId)}/items${periodQuery(period)}` : null,
    selectItems,
  );
}

export function useQuestionStats(activityId: string | null, itemIndex: number | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<{ questions: QuestionStats[] }, QuestionStats[]>(
    activityId && itemIndex !== null
      ? `${base(activityId)}/items/${itemIndex}/questions${periodQuery(period)}`
      : null,
    selectQuestions,
  );
}

export function useActivityDays(activityId: string | null) {
  const { base, shared } = useAnalyticsSource();
  return useApiFetch<{ days: ActivityDay[] }, ActivityDay[]>(
    activityId && !shared ? `${base(activityId)}/days` : null,
    selectDays,
  );
}

export function useGroupStats(activityId: string | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<{ groups: GroupStats[] }, GroupStats[]>(
    activityId ? `${base(activityId)}/groups${periodQuery(period)}` : null,
    selectGroups,
  );
}

export function useAnomalies(activityId: string | null, period?: ActivityPeriod) {
  const { base } = useAnalyticsSource();
  return useApiFetch<{ alerts: AnomalyAlert[] }, AnomalyAlert[]>(
    activityId ? `${base(activityId)}/anomalies${periodQuery(period)}` : null,
    selectAlerts,
  );
}

export function useAuditLog(page = 1, limit = 20) {
  return useApiFetch<
    { logs: AuditLogEntry[]; total: number; page: number; totalPages: number },
    { entries: AuditLogEntry[]; total: number; page: number; pages: number }
  >(
    `/api/admin/analytics/audit-log?page=${page}&limit=${limit}`,
    selectAuditLog,
  );
}

export function usePassThreshold(activityId: string | null) {
  return useApiFetch<{ passThreshold: number | null }, number | null>(
    activityId ? `/api/admin/analytics/activities/${activityId}/pass-threshold` : null,
    (response) => response.passThreshold,
  );
}

export async function savePassThreshold(activityId: string, value: number | null): Promise<number | null> {
  const res = await adminApiFetch<{ passThreshold: number | null }>(
    `/api/admin/analytics/activities/${activityId}/pass-threshold`,
    { method: 'PATCH', body: JSON.stringify({ passThreshold: value }) },
  );
  return res.passThreshold;
}

export function useShareLink(activityId: string | null) {
  return useApiFetch<{ token: string | null }, string | null>(
    activityId ? `/api/admin/analytics/activities/${activityId}/share` : null,
    (response) => response.token,
  );
}

export async function createShareLink(activityId: string): Promise<string> {
  const res = await adminApiFetch<{ token: string }>(
    `/api/admin/analytics/activities/${activityId}/share`,
    { method: 'POST' },
  );
  return res.token;
}

export async function revokeShareLink(activityId: string): Promise<void> {
  await adminApiFetch(`/api/admin/analytics/activities/${activityId}/share`, { method: 'DELETE' });
}

export function useParticipantsRoster(activityId: string | null) {
  return useApiFetch<{ participants: RosterParticipant[] }, RosterParticipant[]>(
    activityId ? `/api/admin/analytics/activities/${activityId}/participants` : null,
    selectParticipants,
  );
}

export async function saveExclusions(activityId: string, excludedReportIds: string[]): Promise<string[]> {
  const res = await adminApiFetch<{ excludedReportIds: string[] }>(
    `/api/admin/analytics/activities/${activityId}/participants/exclusions`,
    { method: 'PATCH', body: JSON.stringify({ excludedReportIds }) },
  );
  return res.excludedReportIds;
}

export interface ScheduledReportSettings {
  enabled: boolean;
  reportType: AnalyticsExportType;
  recipients: string[];
  frequency: 'daily' | 'weekly';
  dayOfWeek?: number;
  scheduleHour: number;
  skipIfUnchanged: boolean;
}

export function useScheduledReport(activityId: string | null) {
  return useApiFetch<{ scheduledReport: ScheduledReportSettings }, ScheduledReportSettings>(
    activityId ? `/api/admin/activities/${activityId}/scheduled-report` : null,
    selectScheduledReport,
  );
}

export async function saveScheduledReport(
  activityId: string,
  settings: ScheduledReportSettings,
): Promise<ScheduledReportSettings> {
  const res = await adminApiFetch<{ scheduledReport: ScheduledReportSettings }>(
    `/api/admin/activities/${activityId}/scheduled-report`,
    { method: 'PUT', body: JSON.stringify(settings) },
  );
  return res.scheduledReport;
}

export async function sendScheduledReportNow(activityId: string): Promise<{ resendId?: string }> {
  return adminApiFetch<{ ok: true; resendId?: string }>(
    `/api/admin/activities/${activityId}/scheduled-report/send-now`,
    { method: 'POST' },
  );
}

export type AnalyticsExportType = 'executive' | 'participants' | 'scores' | 'progress';

async function triggerBlobDownload(res: Response, fallbackName: string) {
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/);
  const filename = utf8Match ? decodeURIComponent(utf8Match[1]) : plainMatch ? plainMatch[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('yooz_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadExport(baseUrl: string, type: AnalyticsExportType, period?: ActivityPeriod) {
  const params = new URLSearchParams({ type });
  if (period) params.set('period', period);
  const res = await fetch(`${baseUrl}/export?${params.toString()}`, { headers: authHeaders() });
  await triggerBlobDownload(res, `${type}-export.xlsx`);
}

function combinedQuery(activityIds: string[], period?: ActivityPeriod, extra?: Record<string, string>) {
  const params = new URLSearchParams({ ids: activityIds.join(','), ...extra });
  if (period) params.set('period', period);
  return params.toString();
}

export function useCombinedReportCard(activityIds: string[], period?: ActivityPeriod) {
  return useApiFetch<CombinedReportData>(
    activityIds.length > 0
      ? `/api/admin/analytics/combined/report-card?${combinedQuery(activityIds, period)}`
      : null,
  );
}

export async function downloadCombinedReportCardExport(activityIds: string[], period?: ActivityPeriod) {
  const res = await fetch(
    `/api/admin/analytics/combined/report-card/export?${combinedQuery(activityIds, period)}`,
    { headers: authHeaders() },
  );
  await triggerBlobDownload(res, 'combined-report-card.xlsx');
}

export async function downloadCombinedExport(activityIds: string[], type: AnalyticsExportType, period?: ActivityPeriod) {
  const res = await fetch(
    `/api/admin/analytics/combined/export?${combinedQuery(activityIds, period, { type })}`,
    { headers: authHeaders() },
  );
  await triggerBlobDownload(res, `combined-${type}.xlsx`);
}
