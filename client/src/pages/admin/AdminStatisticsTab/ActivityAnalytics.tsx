import { useMemo, useState } from 'react';
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
import {
  useActivityAnalytics,
  useAnomalies,
  useFunnel,
  useGroupStats,
  useItemStats,
} from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import type {
  ActivityAnalyticsData,
  ActivitySubTab,
  AnomalyAlert,
  GroupStats,
  ItemStats,
  ParticipantInsight,
} from './types';
import {
  ActionButton,
  AlertBanner,
  AlertIcon,
  AnalyticsHeader,
  DashboardGrid,
  EmptyState,
  FullPanel,
  HeaderActionGroup,
  HeaderEyebrow,
  HeaderMeta,
  InsightItem,
  InsightList,
  InsightMain,
  InsightMeta,
  InsightTitle,
  ItemHealthCard,
  ItemHealthGrid,
  LegendItem,
  LegendLabel,
  LegendValue,
  MetaPill,
  MetricCard,
  MetricGrid,
  MetricLabel,
  MetricSubtext,
  MetricValue,
  NarrowPanel,
  PanelTitle,
  ParticipantTable,
  ProgressFill,
  ProgressTrack,
  RankBadge,
  RecommendationBody,
  RecommendationCard,
  RecommendationTitle,
  SectionTitle,
  StatusBar,
  StatusLegend,
  StatusSegment,
  StatusStack,
  SubTab,
  SubTabBar,
  ValueBadge,
  WidePanel,
} from './styled';
import FunnelChart from './FunnelChart';
import ItemAnalyticsTable from './ItemAnalyticsTable';
import GroupComparison from './GroupComparison';
import ExportSection from './ExportSection';

interface Props {
  activityId: string | null;
  onBack: () => void;
}

type Tone = 'green' | 'blue' | 'amber' | 'red';

function formatDuration(ms?: number | null) {
  if (!ms) return '-';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function percentTone(value: number): Tone {
  if (value >= 85) return 'green';
  if (value >= 70) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

function itemTone(item: ItemStats): Tone {
  if (item.completionPct < 70 || item.avgScore < item.avgMaxScore * 0.45) return 'red';
  if (item.hintUsagePct > 30 || item.completionPct < 82) return 'amber';
  if (item.completionPct >= 90 && item.avgScore >= item.avgMaxScore * 0.75) return 'green';
  return 'blue';
}

function statusLabel(status: ParticipantInsight['status'], t: Record<string, string>) {
  if (status === 'completed') return t.completedLabel;
  if (status === 'in_progress') return t.inProgress;
  return t.joinedOnly;
}

function template(text: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    text,
  );
}

function buildRecommendations(
  analytics: ActivityAnalyticsData,
  anomalies: AnomalyAlert[],
  groups: GroupStats[],
  t: Record<string, string>,
) {
  const recommendations: { title: string; body: string; tone: Tone }[] = [];
  const status = analytics.statusBreakdown ?? {
    joined: 0,
    inProgress: 0,
    completed: Math.round((analytics.completionRate / 100) * analytics.totalParticipants),
  };

  if (anomalies.length > 0) {
    recommendations.push({
      title: t.reviewBottlenecks,
      body: anomalies[0].message,
      tone: anomalies[0].severity === 'error' ? 'red' : 'amber',
    });
  }

  if (status.inProgress > 0) {
    recommendations.push({
      title: t.nudgeParticipants,
      body: template(t.nudgeParticipantsBody, { count: status.inProgress }),
      tone: 'blue',
    });
  }

  const sortedGroups = [...groups].sort((a, b) => b.avgScore - a.avgScore);
  if (sortedGroups.length >= 2) {
    const gap = Math.round(sortedGroups[0].avgScore - sortedGroups[sortedGroups.length - 1].avgScore);
    if (gap >= 12) {
      recommendations.push({
        title: t.groupGap,
        body: template(t.groupGapBody, {
          top: sortedGroups[0].group || '-',
          low: sortedGroups[sortedGroups.length - 1].group || '-',
          gap,
        }),
        tone: 'amber',
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: t.readyForClient,
      body: t.readyForClientBody,
      tone: 'green',
    });
  }

  return recommendations.slice(0, 4);
}

export default function ActivityAnalytics({ activityId, onBack }: Props) {
  const t = useTranslations(texts);
  const [subTab, setSubTab] = useState<ActivitySubTab>('overview');

  const analyticsQuery = useActivityAnalytics(activityId);
  const anomaliesQuery = useAnomalies(activityId);
  const funnelQuery = useFunnel(activityId);
  const itemsQuery = useItemStats(activityId);
  const groupsQuery = useGroupStats(activityId);

  const analytics = analyticsQuery.data;
  const anomalies = anomaliesQuery.data ?? [];
  const funnel = funnelQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const loading = analyticsQuery.loading;

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

  const refetchAll = () => {
    analyticsQuery.refetch();
    anomaliesQuery.refetch();
    funnelQuery.refetch();
    itemsQuery.refetch();
    groupsQuery.refetch();
  };

  if (loading) {
    return <EmptyState>{t.loading}</EmptyState>;
  }

  if (!analytics) {
    return <EmptyState>{t.noData}</EmptyState>;
  }

  const status = analytics.statusBreakdown ?? {
    joined: Math.max(0, analytics.totalParticipants - Math.round((analytics.completionRate / 100) * analytics.totalParticipants)),
    inProgress: 0,
    completed: Math.round((analytics.completionRate / 100) * analytics.totalParticipants),
  };
  const statusTotal = Math.max(analytics.totalParticipants, status.joined + status.inProgress + status.completed, 1);
  const passRate = analytics.scoreSummary?.passRate ?? 0;
  const itemHighlights = [...items]
    .sort((a, b) => {
      const riskA = (100 - a.completionPct) * 2 + a.hintUsagePct + Math.max(0, a.avgMaxScore * 0.65 - a.avgScore);
      const riskB = (100 - b.completionPct) * 2 + b.hintUsagePct + Math.max(0, b.avgMaxScore * 0.65 - b.avgScore);
      return riskB - riskA;
    })
    .slice(0, 4);
  const recommendations = buildRecommendations(analytics, anomalies, groups, t);
  const topParticipants = analytics.topParticipants ?? [];
  const recentParticipants = analytics.recentParticipants ?? [];
  const funnelLabels: Record<string, string> = {
    joined: t.joined,
    started: t.started,
    halfway: t.halfway,
    completed: t.completedStep,
  };

  return (
    <>
      <AnalyticsHeader>
        <div>
          <HeaderEyebrow>
            {t.activityAnalytics}
          </HeaderEyebrow>
          <SectionTitle style={{ fontSize: 24 }}>
            {analytics.activity.name || t.activityAnalytics}
          </SectionTitle>
          <HeaderMeta>
            <MetaPill tone={analytics.activity.status === 'live' ? 'green' : 'amber'}>
              {analytics.activity.status === 'live' ? t.liveStatus : t.previewStatus}
            </MetaPill>
            <MetaPill>{t.code}: {analytics.activity.code}</MetaPill>
            {analytics.activity.moduleType && (
              <MetaPill tone="blue">{t.module}: {analytics.activity.moduleType}</MetaPill>
            )}
          </HeaderMeta>
        </div>
        <HeaderActionGroup>
          <ActionButton type="button" onClick={refetchAll} disabled={loading}>
            {t.refresh}
          </ActionButton>
          <ActionButton type="button" onClick={onBack}>
            {t.back}
          </ActionButton>
        </HeaderActionGroup>
      </AnalyticsHeader>

      <SubTabBar>
        {tabs.map((tab) => (
          <SubTab key={tab.key} active={subTab === tab.key} onClick={() => setSubTab(tab.key)}>
            {tab.label}
          </SubTab>
        ))}
      </SubTabBar>

      {subTab === 'overview' && (
        <DashboardGrid>
          {anomalies.length > 0 && (
            <FullPanel>
              {anomalies.map((a) => (
                <AlertBanner key={`${a.type}-${a.itemIndex ?? a.message}`} severity={a.severity}>
                  <AlertIcon>!</AlertIcon>
                  <span style={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {a.message}
                  </span>
                </AlertBanner>
              ))}
            </FullPanel>
          )}

          <FullPanel>
            <MetricGrid>
              <MetricCard tone="blue">
                <MetricLabel>{t.totalParticipants}</MetricLabel>
                <MetricValue>{analytics.totalParticipants.toLocaleString()}</MetricValue>
                <MetricSubtext>
                  {status.completed} {t.completedLabel} / {status.inProgress} {t.inProgress}
                </MetricSubtext>
              </MetricCard>
              <MetricCard tone={percentTone(analytics.completionRate)}>
                <MetricLabel>{t.completionRate}</MetricLabel>
                <MetricValue>{Math.round(analytics.completionRate)}%</MetricValue>
                <MetricSubtext>{t.avgProgress}: {analytics.avgProgressPct ?? analytics.completionRate}%</MetricSubtext>
              </MetricCard>
              <MetricCard tone={percentTone(analytics.avgScore)}>
                <MetricLabel>{t.avgScore}</MetricLabel>
                <MetricValue>{Math.round(analytics.avgScore)}</MetricValue>
                <MetricSubtext>
                  {t.median}: {Math.round(analytics.medianScore)} / {t.passRate}: {passRate}%
                </MetricSubtext>
              </MetricCard>
              <MetricCard tone="amber">
                <MetricLabel>{t.avgDuration}</MetricLabel>
                <MetricValue>{formatDuration(analytics.avgDurationMs)}</MetricValue>
                <MetricSubtext>
                  {t.fastest}: {formatDuration(analytics.durationSummary?.fastestMs)}
                </MetricSubtext>
              </MetricCard>
            </MetricGrid>
          </FullPanel>

          <NarrowPanel>
            <PanelTitle>{t.completionMix}</PanelTitle>
            <StatusStack>
              <StatusBar aria-label={t.completionMix}>
                <StatusSegment pct={percent(status.completed, statusTotal)} tone="green" />
                <StatusSegment pct={percent(status.inProgress, statusTotal)} tone="blue" />
                <StatusSegment pct={percent(status.joined, statusTotal)} tone="amber" />
              </StatusBar>
              <StatusLegend>
                <LegendItem>
                  <LegendLabel>{t.completedLabel}</LegendLabel>
                  <LegendValue>{status.completed}</LegendValue>
                </LegendItem>
                <LegendItem>
                  <LegendLabel>{t.inProgress}</LegendLabel>
                  <LegendValue>{status.inProgress}</LegendValue>
                </LegendItem>
                <LegendItem>
                  <LegendLabel>{t.joinedOnly}</LegendLabel>
                  <LegendValue>{status.joined}</LegendValue>
                </LegendItem>
              </StatusLegend>
              {funnel.length > 0 && (
                <InsightList>
                  {funnel.map((step, index) => {
                    const previous = index > 0 ? funnel[index - 1].count : step.count;
                    const drop = previous > 0 ? Math.max(0, Math.round(((previous - step.count) / previous) * 100)) : 0;
                    return (
                      <InsightItem key={step.step}>
                        <InsightMain>
                          <InsightTitle>{funnelLabels[step.step] || step.step}</InsightTitle>
                          <ProgressTrack>
                            <ProgressFill pct={step.pct} tone={percentTone(step.pct)} />
                          </ProgressTrack>
                        </InsightMain>
                        <ValueBadge tone={percentTone(step.pct)}>
                          {step.count} / {step.pct}%{drop > 0 ? ` -${drop}%` : ''}
                        </ValueBadge>
                      </InsightItem>
                    );
                  })}
                </InsightList>
              )}
            </StatusStack>
          </NarrowPanel>

          <WidePanel>
            <PanelTitle>{t.scoreDistribution}</PanelTitle>
            {scoreDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={scoreDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececf3" />
                  <XAxis dataKey="range" fontSize={12} tick={{ fill: '#697586' }} />
                  <YAxis fontSize={12} tick={{ fill: '#697586' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2d8bd8" radius={[6, 6, 0, 0]} name={t.count} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>{t.noData}</EmptyState>
            )}
          </WidePanel>

          <WidePanel>
            <PanelTitle>{t.flowHealth}</PanelTitle>
            {itemHighlights.length > 0 ? (
              <ItemHealthGrid>
                {itemHighlights.map((item) => {
                  const tone = itemTone(item);
                  return (
                    <ItemHealthCard key={item.itemIndex}>
                      <InsightTitle>{item.itemIndex + 1}. {item.itemName || `${t.itemName} ${item.itemIndex + 1}`}</InsightTitle>
                      <InsightMeta>
                        {item.gameType || item.itemType} / {item.participantCount} {t.participants}
                      </InsightMeta>
                      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                        <div>
                          <InsightMeta>{t.completionPct}: {Math.round(item.completionPct)}%</InsightMeta>
                          <ProgressTrack>
                            <ProgressFill pct={item.completionPct} tone={tone} />
                          </ProgressTrack>
                        </div>
                        <InsightMeta>
                          {t.avgItemScore}: {Math.round(item.avgScore)}/{Math.round(item.avgMaxScore)} / {t.hintUsage}: {Math.round(item.hintUsagePct)}%
                        </InsightMeta>
                        <ValueBadge tone={tone}>
                          {tone === 'red' || tone === 'amber' ? t.attention : t.healthy}
                        </ValueBadge>
                      </div>
                    </ItemHealthCard>
                  );
                })}
              </ItemHealthGrid>
            ) : (
              <EmptyState>{t.noItemData}</EmptyState>
            )}
          </WidePanel>

          <NarrowPanel>
            <PanelTitle>{t.recommendations}</PanelTitle>
            <InsightList>
              {recommendations.map((item) => (
                <RecommendationCard key={item.title} tone={item.tone}>
                  <RecommendationTitle>{item.title}</RecommendationTitle>
                  <RecommendationBody>{item.body}</RecommendationBody>
                </RecommendationCard>
              ))}
            </InsightList>
          </NarrowPanel>

          <WidePanel>
            <PanelTitle>{t.topPlayers}</PanelTitle>
            {topParticipants.length > 0 ? (
              <ParticipantTable>
                <thead>
                  <tr>
                    <th />
                    <th>{t.participant}</th>
                    <th>{t.group}</th>
                    <th>{t.score}</th>
                    <th>{t.duration}</th>
                    <th>{t.progress}</th>
                  </tr>
                </thead>
                <tbody>
                  {topParticipants.map((participant, index) => (
                    <tr key={`${participant.name}-${participant.joinedAt}`}>
                      <td><RankBadge>{index + 1}</RankBadge></td>
                      <td style={{ fontWeight: 800 }}>{participant.name}</td>
                      <td>{participant.group || '-'}</td>
                      <td>{Math.round(participant.score)}</td>
                      <td>{formatDuration(participant.durationMs)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressTrack>
                            <ProgressFill pct={participant.progressPct} tone={percentTone(participant.progressPct)} />
                          </ProgressTrack>
                          <span>{participant.progressPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ParticipantTable>
            ) : (
              <EmptyState>{t.noPlayerData}</EmptyState>
            )}
          </WidePanel>

          <NarrowPanel>
            <PanelTitle>{t.recentPlayers}</PanelTitle>
            {recentParticipants.length > 0 ? (
              <InsightList>
                {recentParticipants.map((participant) => (
                  <InsightItem key={`${participant.name}-${participant.joinedAt}`}>
                    <InsightMain>
                      <InsightTitle>{participant.name}</InsightTitle>
                      <InsightMeta>
                        {participant.group || '-'} / {formatDateTime(participant.joinedAt)}
                      </InsightMeta>
                    </InsightMain>
                    <ValueBadge tone={percentTone(participant.progressPct)}>
                      {statusLabel(participant.status, t)}
                    </ValueBadge>
                  </InsightItem>
                ))}
              </InsightList>
            ) : (
              <EmptyState>{t.noPlayerData}</EmptyState>
            )}
          </NarrowPanel>

          {groups.length > 0 && (
            <FullPanel>
              <PanelTitle>{t.groupHighlights}</PanelTitle>
              <InsightList>
                {groups.slice(0, 5).map((group) => (
                  <InsightItem key={group.group}>
                    <InsightMain>
                      <InsightTitle>{group.group || '-'}</InsightTitle>
                      <InsightMeta>
                        {group.memberCount} {t.members} / {t.avgDuration}: {formatDuration(group.avgDurationMs)}
                      </InsightMeta>
                      <ProgressTrack>
                        <ProgressFill pct={group.avgScore} tone={percentTone(group.avgScore)} />
                      </ProgressTrack>
                    </InsightMain>
                    <ValueBadge tone={percentTone(group.completionRate)}>
                      {Math.round(group.avgScore)} {t.score} / {Math.round(group.completionRate)}%
                    </ValueBadge>
                  </InsightItem>
                ))}
              </InsightList>
            </FullPanel>
          )}

          {analytics.missionStats && (
            <FullPanel>
              <PanelTitle>{t.missionStats}</PanelTitle>
              <MetricGrid>
                <MetricCard tone="blue">
                  <MetricLabel>{t.puzzleCompletions}</MetricLabel>
                  <MetricValue>{analytics.missionStats.puzzleCompletions}</MetricValue>
                  <MetricSubtext>{t.completedLabel}</MetricSubtext>
                </MetricCard>
                <MetricCard tone="green">
                  <MetricLabel>{t.trashSortCompletions}</MetricLabel>
                  <MetricValue>{analytics.missionStats.trashSortCompletions}</MetricValue>
                  <MetricSubtext>{t.completedLabel}</MetricSubtext>
                </MetricCard>
                <MetricCard tone={percentTone(analytics.missionStats.avgTrashSortScore)}>
                  <MetricLabel>{t.avgTrashSortScore}</MetricLabel>
                  <MetricValue>{analytics.missionStats.avgTrashSortScore}</MetricValue>
                  <MetricSubtext>{t.avgScore}</MetricSubtext>
                </MetricCard>
              </MetricGrid>
            </FullPanel>
          )}
        </DashboardGrid>
      )}

      {subTab === 'funnel' && (
        <FunnelChart activityId={activityId} />
      )}

      {subTab === 'items' && (
        <ItemAnalyticsTable activityId={activityId} />
      )}

      {subTab === 'groups' && (
        <GroupComparison activityId={activityId} />
      )}

      {subTab === 'export' && <ExportSection activityId={activityId} />}
    </>
  );
}
