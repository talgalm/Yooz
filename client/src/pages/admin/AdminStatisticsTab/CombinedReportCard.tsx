import { useMemo, useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import {
  useCombinedReportCard,
  downloadCombinedReportCardExport,
  downloadCombinedExport,
  type AnalyticsExportType,
} from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import {
  BackButton,
  EmptyState,
  ExportCard,
  ExportDescription,
  ExportGrid,
  ExportIcon,
  ExportLabel,
  FullPanel,
  MetricCard,
  MetricGrid,
  MetricLabel,
  MetricSubtext,
  MetricValue,
  PanelTitle,
  ParticipantTable,
  PeriodButton,
  PeriodControl,
  PeriodLabel,
  RankBadge,
  RosterSearchInput,
  SectionTitle,
  ValueBadge,
} from './styled';
import type { ActivityPeriod } from './types';

interface Props {
  activityIds: string[];
  onBack: () => void;
}

type Tone = 'green' | 'blue' | 'amber' | 'red';

function gradeTone(value: number): Tone {
  if (value >= 85) return 'green';
  if (value >= 70) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

export default function CombinedReportCard({ activityIds, onBack }: Props) {
  const t = useTranslations(texts);
  const [period, setPeriod] = useState<ActivityPeriod>('year');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, loading, error } = useCombinedReportCard(activityIds, period);
  const participants = data?.participants ?? [];
  const activities = data?.activities ?? [];
  const avgFinal = data?.avgFinalGrade ?? null;

  const rankByKey = useMemo(() => {
    const map = new Map<string, number>();
    participants.forEach((p, index) => map.set(p.key, index + 1));
    return map;
  }, [participants]);

  const periodOptions: { key: ActivityPeriod; label: string }[] = [
    { key: 'day', label: t.periodDay },
    { key: 'week', label: t.periodWeek },
    { key: 'month', label: t.periodMonth },
    { key: 'year', label: t.periodYear },
  ];

  const exportOptions: { key: string; type?: AnalyticsExportType; icon: string; label: string; description: string }[] = [
    { key: 'report-card', icon: 'RC', label: t.exportReportCard, description: t.exportReportCardDescription },
    { key: 'executive', type: 'executive', icon: 'XL', label: t.exportExecutive, description: t.exportExecutiveDescription },
    { key: 'participants', type: 'participants', icon: 'P', label: t.exportParticipants, description: t.exportParticipantsDescription },
    { key: 'scores', type: 'scores', icon: 'S', label: t.exportScores, description: t.exportScoresDescription },
    { key: 'progress', type: 'progress', icon: '%', label: t.exportProgress, description: t.exportProgressDescription },
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter(
      (p) => (p.name || '').toLowerCase().includes(query) || (p.email || '').toLowerCase().includes(query),
    );
  }, [participants, search]);

  const handleExport = async (key: string, type?: AnalyticsExportType) => {
    setExportError(null);
    setDownloading(key);
    try {
      if (type) await downloadCombinedExport(activityIds, type, period);
      else await downloadCombinedReportCardExport(activityIds, period);
    } catch {
      setExportError(t.exportFailed);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton type="button" onClick={onBack}>← {t.back}</BackButton>
          <SectionTitle>{t.combinedReport}</SectionTitle>
        </div>
        <PeriodControl aria-label={t.periodFilter}>
          <PeriodLabel>{t.periodFilter}</PeriodLabel>
          {periodOptions.map((option) => (
            <PeriodButton
              key={option.key}
              type="button"
              active={period === option.key}
              onClick={() => setPeriod(option.key)}
            >
              {option.label}
            </PeriodButton>
          ))}
        </PeriodControl>
      </div>

      <FullPanel style={{ marginBottom: 16 }}>
        <MetricGrid>
          <MetricCard tone="blue">
            <MetricLabel>{t.uniqueParticipants}</MetricLabel>
            <MetricValue>{(data?.totalParticipants ?? 0).toLocaleString()}</MetricValue>
            <MetricSubtext>{activities.length} {t.activities}</MetricSubtext>
          </MetricCard>
          <MetricCard tone={avgFinal !== null ? gradeTone(avgFinal) : 'blue'}>
            <MetricLabel>{t.avgFinalGrade}</MetricLabel>
            <MetricValue>{avgFinal !== null ? avgFinal : '—'}</MetricValue>
            <MetricSubtext>{t.finalGrade}</MetricSubtext>
          </MetricCard>
        </MetricGrid>
      </FullPanel>

      <FullPanel style={{ marginBottom: 16 }}>
        <PanelTitle>{t.combinedReports}</PanelTitle>
        <div style={{ fontSize: 12, color: '#697586', lineHeight: 1.5, marginBottom: 12 }}>{t.combinedReportsHint}</div>
        <ExportGrid>
          {exportOptions.map((option) => (
            <ExportCard
              key={option.key}
              onClick={() => handleExport(option.key, option.type)}
              disabled={downloading !== null || participants.length === 0}
              style={{ opacity: downloading && downloading !== option.key ? 0.5 : 1 }}
            >
              <ExportIcon>{option.icon}</ExportIcon>
              <ExportLabel>{downloading === option.key ? t.downloading : option.label}</ExportLabel>
              <ExportDescription>{option.description}</ExportDescription>
            </ExportCard>
          ))}
        </ExportGrid>
        {exportError && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 10 }}>{exportError}</div>}
      </FullPanel>

      <FullPanel>
        <PanelTitle>{t.reportCardTitle}</PanelTitle>
        <div style={{ fontSize: 12, color: '#697586', lineHeight: 1.5, marginBottom: 12 }}>{t.reportCardHint}</div>

        <RosterSearchInput
          placeholder={t.searchParticipants}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {error ? (
          <EmptyState>{t.reportLoadFailed}</EmptyState>
        ) : loading && !data ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : participants.length === 0 ? (
          <EmptyState>{t.noParticipants}</EmptyState>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <ParticipantTable>
              <thead>
                <tr>
                  <th />
                  <th>{t.participant}</th>
                  {activities.map((activity, index) => (
                    <th key={activity._id}>{index + 1}. {activity.name}</th>
                  ))}
                  <th>{t.finalGrade}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.key}>
                    <td><RankBadge>{rankByKey.get(p.key)}</RankBadge></td>
                    <td style={{ fontWeight: 700 }}>{p.name || '-'}</td>
                    {activities.map((activity) => {
                      const grade = p.grades[activity._id];
                      return (
                        <td key={activity._id}>
                          {grade === null || grade === undefined ? '—' : Math.round(grade)}
                        </td>
                      );
                    })}
                    <td>
                      {p.finalGrade === null
                        ? '—'
                        : <ValueBadge tone={gradeTone(p.finalGrade)}>{p.finalGrade}</ValueBadge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ParticipantTable>
          </div>
        )}
      </FullPanel>
    </>
  );
}
