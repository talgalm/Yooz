import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslations } from '../../../context/LanguageContext';
import { useActivityAnalytics, useAnomalies } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import type { ActivitySubTab } from './types';
import {
  SectionHeader,
  SectionTitle,
  BackButton,
  SubTabBar,
  SubTab,
  KpiRow,
  KpiCard,
  KpiValue,
  KpiLabel,
  KpiSub,
  ChartCard,
  ChartTitle,
  AlertBanner,
  AlertIcon,
} from './styled';
import FunnelChart from './FunnelChart';
import ItemAnalyticsTable from './ItemAnalyticsTable';
import GroupComparison from './GroupComparison';
import ExportSection from './ExportSection';

interface Props {
  activityId: string;
  onBack: () => void;
}

function formatDuration(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ActivityAnalytics({ activityId, onBack }: Props) {
  const t = useTranslations(texts);
  const [subTab, setSubTab] = useState<ActivitySubTab>('overview');
  const { data: analytics, loading } = useActivityAnalytics(activityId);
  const { data: anomalies } = useAnomalies(activityId);

  const scoreDist = useMemo(() => {
    if (!analytics?.scoreDistribution) return [];
    return analytics.scoreDistribution.map((b) => ({
      range: `${b.min}-${b.max}`,
      count: b.count,
    }));
  }, [analytics]);

  const tabs: { key: ActivitySubTab; label: string }[] = [
    { key: 'overview', label: t.overviewTab },
    { key: 'funnel', label: t.funnelTab },
    { key: 'items', label: t.itemsTab },
    { key: 'groups', label: t.groupsTab },
    { key: 'export', label: t.exportTab },
  ];

  return (
    <>
      {/* Header */}
      <SectionHeader>
        <SectionTitle>
          {analytics?.activity?.name || t.activityAnalytics}
        </SectionTitle>
        <BackButton onClick={onBack}>← {t.back}</BackButton>
      </SectionHeader>

      {/* Sub-tabs */}
      <SubTabBar>
        {tabs.map((tab) => (
          <SubTab key={tab.key} active={subTab === tab.key} onClick={() => setSubTab(tab.key)}>
            {tab.label}
          </SubTab>
        ))}
      </SubTabBar>

      {/* Anomaly alerts */}
      {anomalies && anomalies.length > 0 && subTab === 'overview' && (
        <div style={{ marginBottom: 16 }}>
          {anomalies.map((a, i) => (
            <AlertBanner key={i} severity={a.severity}>
              <AlertIcon>{a.severity === 'error' ? '🔴' : '⚠️'}</AlertIcon>
              {a.message}
              {a.itemName && <span style={{ fontWeight: 600 }}> — {a.itemName}</span>}
            </AlertBanner>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t.loading}</div>
      )}

      {/* ── Overview sub-tab ── */}
      {subTab === 'overview' && analytics && (
        <>
          <KpiRow>
            <KpiCard>
              <KpiValue>{analytics.totalParticipants.toLocaleString()}</KpiValue>
              <KpiLabel>{t.totalParticipants}</KpiLabel>
            </KpiCard>
            <KpiCard>
              <KpiValue>{Math.round(analytics.completionRate)}%</KpiValue>
              <KpiLabel>{t.completionRate}</KpiLabel>
            </KpiCard>
            <KpiCard>
              <KpiValue>{Math.round(analytics.avgScore)}</KpiValue>
              <KpiLabel>{t.avgScore}</KpiLabel>
              <KpiSub>
                {t.median}: {Math.round(analytics.medianScore)}
              </KpiSub>
            </KpiCard>
            <KpiCard>
              <KpiValue>{formatDuration(analytics.avgDurationMs)}</KpiValue>
              <KpiLabel>{t.avgDuration}</KpiLabel>
              <KpiSub>
                {t.median}: {formatDuration(analytics.medianDurationMs)}
              </KpiSub>
            </KpiCard>
          </KpiRow>

          {/* Score distribution chart */}
          {scoreDist.length > 0 && (
            <ChartCard>
              <ChartTitle>{t.scoreDistribution}</ChartTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececf3" />
                  <XAxis dataKey="range" fontSize={12} tick={{ fill: '#888' }} />
                  <YAxis fontSize={12} tick={{ fill: '#888' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6c5ce7" radius={[6, 6, 0, 0]} name={t.count} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}

      {/* ── Funnel sub-tab ── */}
      {subTab === 'funnel' && <FunnelChart activityId={activityId} />}

      {/* ── Items sub-tab ── */}
      {subTab === 'items' && <ItemAnalyticsTable activityId={activityId} />}

      {/* ── Groups sub-tab ── */}
      {subTab === 'groups' && <GroupComparison activityId={activityId} />}

      {/* ── Export sub-tab ── */}
      {subTab === 'export' && <ExportSection activityId={activityId} />}
    </>
  );
}
