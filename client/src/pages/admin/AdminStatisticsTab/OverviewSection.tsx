import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from '../../../context/LanguageContext';
import { useOverview, useTimeline } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import {
  KpiRow,
  KpiCard,
  KpiValue,
  KpiLabel,
  KpiSub,
  ChartCard,
  ChartTitle,
  SectionHeader,
  SectionTitle,
  StatsTable,
  StatsMobileCard,
  StatsMobileRow,
  StatsMobileLabel,
  StatsMobileValue,
  ActionButton,
} from './styled';
import { DesktopOnly, HideOnDesktop } from '../../../components/styled';

interface Activity {
  _id: string;
  code: string;
  name: string;
  status: 'preview' | 'live';
}

interface Props {
  activities: Activity[];
  onSelectActivity: (id: string) => void;
  onViewAuditLog: () => void;
  onViewShowcase: () => void;
}

function formatDuration(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

export default function OverviewSection({ activities, onSelectActivity, onViewAuditLog, onViewShowcase }: Props) {
  const t = useTranslations(texts);
  const { data: overview, loading: overviewLoading } = useOverview();
  const { data: timeline } = useTimeline(30);
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(activities);

  const chartData = useMemo(() => {
    if (!timeline) return [];
    return timeline.map((p) => ({
      date: p.date.slice(5), // MM-DD
      count: p.count,
    }));
  }, [timeline]);

  if (overviewLoading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t.loading}</div>;
  }

  if (!overview) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
        <div style={{ marginBottom: 14 }}>{t.noData}</div>
        <ActionButton type="button" onClick={onViewShowcase} variant="primary">
          {t.viewShowcase}
        </ActionButton>
      </div>
    );
  }

  return (
    <>
      {/* ── KPI Cards ── */}
      <KpiRow>
        <KpiCard>
          <KpiValue>{overview.totalParticipants.toLocaleString()}</KpiValue>
          <KpiLabel>{t.totalParticipants}</KpiLabel>
          <KpiSub>
            {overview.participantsToday} {t.today} · {overview.participantsThisWeek} {t.thisWeek}
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiValue>{Math.round(overview.completionRate)}%</KpiValue>
          <KpiLabel>{t.completionRate}</KpiLabel>
          <KpiSub>
            {overview.activeActivities} {t.active}
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiValue>{formatDuration(overview.avgDurationMs)}</KpiValue>
          <KpiLabel>{t.avgDuration}</KpiLabel>
          <KpiSub>
            {t.median}: {formatDuration(overview.medianDurationMs)}
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiValue>{Math.round(overview.avgScore)}</KpiValue>
          <KpiLabel>{t.avgScore}</KpiLabel>
          <KpiSub>
            {t.median}: {Math.round(overview.medianScore)}
          </KpiSub>
        </KpiCard>
      </KpiRow>

      {/* ── Timeline Chart ── */}
      {chartData.length > 0 && (
        <ChartCard>
          <ChartTitle>{t.joinTimeline}</ChartTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ececf3" />
              <XAxis dataKey="date" fontSize={12} tick={{ fill: '#888' }} />
              <YAxis fontSize={12} tick={{ fill: '#888' }} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6c5ce7"
                strokeWidth={2}
                fill="url(#colorJoins)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Activities Table ── */}
      <SectionHeader>
        <SectionTitle>{t.activitiesTable}</SectionTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton type="button" onClick={onViewShowcase} variant="primary">
            {t.viewShowcase}
          </ActionButton>
          <ActionButton type="button" onClick={onViewAuditLog}>
            {t.viewAuditLog}
          </ActionButton>
        </div>
      </SectionHeader>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', padding: 24 }}>{t.noData}</div>
      ) : (
        <>
          <DesktopOnly>
            <ChartCard style={{ padding: 0, overflow: 'hidden' }}>
              <StatsTable>
                <thead>
                  <tr>
                    <th>{t.itemName}</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>{t.totalParticipants}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((a) => (
                    <tr key={a._id} onClick={() => onSelectActivity(a._id)}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td><code>{a.code}</code></td>
                      <td>{a.status}</td>
                      <td>→</td>
                    </tr>
                  ))}
                </tbody>
              </StatsTable>
            </ChartCard>
          </DesktopOnly>

          <HideOnDesktop>
            {pageItems.map((a) => (
              <StatsMobileCard key={a._id} onClick={() => onSelectActivity(a._id)}>
                <StatsMobileRow>
                  <StatsMobileValue>{a.name}</StatsMobileValue>
                  <span style={{ fontSize: 12, color: '#888' }}>{a.status}</span>
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{a.code}</StatsMobileLabel>
                  <span style={{ color: '#6c5ce7' }}>→</span>
                </StatsMobileRow>
              </StatsMobileCard>
            ))}
          </HideOnDesktop>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
        </>
      )}
    </>
  );
}
