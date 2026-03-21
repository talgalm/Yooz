import { useTranslations } from '../../../context/LanguageContext';
import { useFunnel } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import { ChartCard, ChartTitle, FunnelContainer, FunnelStep, FunnelCount } from './styled';

interface Props {
  activityId: string;
}

export default function FunnelChart({ activityId }: Props) {
  const t = useTranslations(texts);
  const { data: funnel, loading } = useFunnel(activityId);

  const stepLabels: Record<string, string> = {
    joined: t.joined,
    started: t.started,
    halfway: t.halfway,
    completed: t.completedStep,
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.loading}</div>;
  }

  if (!funnel || funnel.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.noData}</div>;
  }

  const maxCount = funnel[0]?.count || 1;

  return (
    <ChartCard>
      <ChartTitle>{t.funnelTab}</ChartTitle>
      <FunnelContainer>
        {funnel.map((step, i) => {
          const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 20;
          const prevCount = i > 0 ? funnel[i - 1].count : step.count;
          const dropOff = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;

          return (
            <FunnelStep key={step.step} widthPct={widthPct}>
              <span>{stepLabels[step.step] || step.step}</span>
              <FunnelCount>
                {step.count} ({Math.round(step.pct)}%)
                {i > 0 && dropOff > 0 && (
                  <span style={{ opacity: 0.7, marginInlineStart: 8, fontSize: 11 }}>
                    ↓{dropOff}% {t.dropOff}
                  </span>
                )}
              </FunnelCount>
            </FunnelStep>
          );
        })}
      </FunnelContainer>
    </ChartCard>
  );
}
