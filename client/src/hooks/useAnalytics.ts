import { useState, useEffect, useCallback } from 'react';
import { adminApiFetch } from '../utils/adminApi';
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
} from '../pages/admin/AdminStatisticsTab/types';

const selectTimeline = (response: { timeline: TimelinePoint[] }) => response.timeline;
const selectFunnel = (response: { funnel: FunnelStep[] }) => response.funnel;
const selectItems = (response: { items: ItemStats[] }) => response.items;
const selectQuestions = (response: { questions: QuestionStats[] }) => response.questions;
const selectGroups = (response: { groups: GroupStats[] }) => response.groups;
const selectAlerts = (response: { alerts: AnomalyAlert[] }) => response.alerts;
const selectAuditLog = (response: { logs: AuditLogEntry[]; total: number; page: number; totalPages: number }) => ({
  entries: response.logs,
  total: response.total,
  page: response.page,
  pages: response.totalPages,
});

// ── Generic fetcher with loading / error ──

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

// ── Specific hooks ──

export function useOverview() {
  return useApiFetch<OverviewData>('/api/admin/analytics/overview');
}

export function useTimeline(days = 30) {
  return useApiFetch<{ timeline: TimelinePoint[] }, TimelinePoint[]>(
    `/api/admin/analytics/overview/timeline?days=${days}`,
    selectTimeline,
  );
}

export function useActivityAnalytics(activityId: string | null) {
  return useApiFetch<ActivityAnalyticsData>(
    activityId ? `/api/admin/analytics/activities/${activityId}` : null,
  );
}

export function useFunnel(activityId: string | null) {
  return useApiFetch<{ funnel: FunnelStep[] }, FunnelStep[]>(
    activityId ? `/api/admin/analytics/activities/${activityId}/funnel` : null,
    selectFunnel,
  );
}

export function useItemStats(activityId: string | null) {
  return useApiFetch<{ items: ItemStats[] }, ItemStats[]>(
    activityId ? `/api/admin/analytics/activities/${activityId}/items` : null,
    selectItems,
  );
}

export function useQuestionStats(activityId: string | null, itemIndex: number | null) {
  return useApiFetch<{ questions: QuestionStats[] }, QuestionStats[]>(
    activityId && itemIndex !== null
      ? `/api/admin/analytics/activities/${activityId}/items/${itemIndex}/questions`
      : null,
    selectQuestions,
  );
}

export function useGroupStats(activityId: string | null) {
  return useApiFetch<{ groups: GroupStats[] }, GroupStats[]>(
    activityId ? `/api/admin/analytics/activities/${activityId}/groups` : null,
    selectGroups,
  );
}

export function useAnomalies(activityId: string | null) {
  return useApiFetch<{ alerts: AnomalyAlert[] }, AnomalyAlert[]>(
    activityId ? `/api/admin/analytics/activities/${activityId}/anomalies` : null,
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

// ── Export helper (triggers download) ──

export type AnalyticsExportType = 'executive' | 'participants' | 'scores' | 'progress';

export async function downloadExport(activityId: string, type: AnalyticsExportType) {
  const token = localStorage.getItem('yooz_admin_token');
  const res = await fetch(`/api/admin/analytics/activities/${activityId}/export?type=${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  // Try RFC 5987 filename* first (supports unicode), then fall back to plain filename
  const utf8Match = disposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/);
  const filename = utf8Match ? decodeURIComponent(utf8Match[1]) : plainMatch ? plainMatch[1] : `${type}-export.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
