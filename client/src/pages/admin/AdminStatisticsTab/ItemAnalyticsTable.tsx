import { useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useItemStats, useQuestionStats } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import {
  ChartCard,
  ChartTitle,
  StatsTable,
  ImprovementBadge,
  StatsMobileCard,
  StatsMobileRow,
  StatsMobileLabel,
  StatsMobileValue,
} from './styled';
import { DesktopOnly, HideOnDesktop } from '../../../components/styled';

interface Props {
  activityId: string;
}

function formatDuration(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ItemAnalyticsTable({ activityId }: Props) {
  const t = useTranslations(texts);
  const { data: items, loading } = useItemStats(activityId);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.loading}</div>;
  }

  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.noData}</div>;
  }

  return (
    <>
      <DesktopOnly>
        <ChartCard style={{ padding: 0, overflow: 'hidden' }}>
          <StatsTable>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.itemName}</th>
                <th>{t.itemType}</th>
                <th>{t.avgItemScore}</th>
                <th>{t.avgItemDuration}</th>
                <th>{t.hintUsage}</th>
                <th>{t.completionPct}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const needsImprovement = item.completionPct < 70 || item.avgScore < item.avgMaxScore * 0.3;
                return (
                  <>
                    <tr
                      key={item.itemIndex}
                      onClick={() =>
                        setExpandedItem(expandedItem === item.itemIndex ? null : item.itemIndex)
                      }
                    >
                      <td>{item.itemIndex + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.itemName || `Item ${item.itemIndex + 1}`}</td>
                      <td>{item.gameType || item.itemType}</td>
                      <td>
                        {Math.round(item.avgScore)}/{Math.round(item.avgMaxScore)}
                      </td>
                      <td>{formatDuration(item.avgDurationMs)}</td>
                      <td>{Math.round(item.hintUsagePct)}%</td>
                      <td>{Math.round(item.completionPct)}%</td>
                      <td>
                        {needsImprovement && (
                          <ImprovementBadge>{t.needsImprovement}</ImprovementBadge>
                        )}
                      </td>
                    </tr>
                    {expandedItem === item.itemIndex && (
                      <tr key={`${item.itemIndex}-questions`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <QuestionBreakdown activityId={activityId} itemIndex={item.itemIndex} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </StatsTable>
        </ChartCard>
      </DesktopOnly>

      <HideOnDesktop>
        {items.map((item) => {
          const needsImprovement = item.completionPct < 70 || item.avgScore < item.avgMaxScore * 0.3;
          return (
            <div key={item.itemIndex}>
              <StatsMobileCard
                onClick={() =>
                  setExpandedItem(expandedItem === item.itemIndex ? null : item.itemIndex)
                }
              >
                <StatsMobileRow>
                  <StatsMobileValue>
                    {item.itemIndex + 1}. {item.itemName || `Item ${item.itemIndex + 1}`}
                  </StatsMobileValue>
                  {needsImprovement && <ImprovementBadge>{t.needsImprovement}</ImprovementBadge>}
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{t.avgItemScore}</StatsMobileLabel>
                  <StatsMobileValue>
                    {Math.round(item.avgScore)}/{Math.round(item.avgMaxScore)}
                  </StatsMobileValue>
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{t.avgItemDuration}</StatsMobileLabel>
                  <StatsMobileValue>{formatDuration(item.avgDurationMs)}</StatsMobileValue>
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{t.hintUsage}</StatsMobileLabel>
                  <StatsMobileValue>{Math.round(item.hintUsagePct)}%</StatsMobileValue>
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{t.completionPct}</StatsMobileLabel>
                  <StatsMobileValue>{Math.round(item.completionPct)}%</StatsMobileValue>
                </StatsMobileRow>
              </StatsMobileCard>
              {expandedItem === item.itemIndex && (
                <QuestionBreakdown activityId={activityId} itemIndex={item.itemIndex} />
              )}
            </div>
          );
        })}
      </HideOnDesktop>
    </>
  );
}

// ── Question Breakdown (nested table) ──

function QuestionBreakdown({ activityId, itemIndex }: { activityId: string; itemIndex: number }) {
  const t = useTranslations(texts);
  const { data: questions, loading } = useQuestionStats(activityId, itemIndex);

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>{t.loading}</div>;
  }

  if (!questions || questions.length === 0) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>{t.noData}</div>;
  }

  return (
    <div style={{ background: '#f8f7ff', padding: '12px 16px' }}>
      <ChartTitle style={{ fontSize: 14, marginBottom: 8 }}>{t.questionsBreakdown}</ChartTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 600 }}>
              #
            </th>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 600 }}>
              {t.question}
            </th>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 600 }}>
              {t.successRate}
            </th>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 600 }}>
              {t.avgTime}
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.questionIndex}>
              <td style={{ padding: '6px 10px' }}>{q.questionIndex + 1}</td>
              <td style={{ padding: '6px 10px' }}>{q.questionText || `Q${q.questionIndex + 1}`}</td>
              <td style={{ padding: '6px 10px' }}>
                <span
                  style={{
                    color: q.successRate >= 70 ? '#059669' : q.successRate >= 40 ? '#d97706' : '#dc2626',
                    fontWeight: 700,
                  }}
                >
                  {Math.round(q.successRate)}%
                </span>
              </td>
              <td style={{ padding: '6px 10px' }}>{Math.round(q.avgTimeMs / 1000)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
