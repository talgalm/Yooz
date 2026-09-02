import { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import ExpensesPanel from './ExpensesPanel';
import ChangeRequestsPanel from './ChangeRequestsPanel';
import {
  Project, ProjectMoney, MonthMoney, HEALTH_COLORS, formatMoney, formatPercent,
} from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import { Panel, EmptyState, ErrorNote, Tabs, Tab, MOBILE } from '../manageUi';

const Strip = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 14,
  padding: 20,
  borderBottom: `1px solid ${BORDER}`,
  [MOBILE]: { padding: 16 },
});
const Stat = styled('div')({ display: 'flex', flexDirection: 'column', gap: 3 });
const StatLabel = styled('span')({ fontSize: 12.5, color: TEXT_LIGHT });
const StatValue = styled('b')<{ tone?: string }>(({ tone }) => ({
  fontSize: 20, fontWeight: 700, color: tone ?? 'inherit',
}));

const Breakdown = styled('div')({ padding: 20 });
const Line = styled('div')<{ strong?: boolean }>(({ strong }) => ({
  display: 'flex', justifyContent: 'space-between', gap: 12,
  padding: '7px 0', fontSize: 14,
  fontWeight: strong ? 700 : 400,
  borderTop: strong ? `1px solid ${BORDER}` : 'none',
  marginTop: strong ? 6 : 0,
}));

/**
 * The caveat is rendered unconditionally, never behind a toggle.
 * A margin figure without it becomes a number people trust more than it deserves.
 */
const Caveat = styled('div')({
  padding: '10px 20px',
  fontSize: 12.5,
  color: TEXT_LIGHT,
  background: '#faf9fd',
  borderTop: `1px solid ${BORDER}`,
});

interface Data { cumulative: ProjectMoney; monthly: MonthMoney; actualHours: number }

export default function MoneyTab({ project }: { project: Project }) {
  const t = useTranslations(texts);
  // Monthly is the default — spec ch.10 decision 3.
  const [view, setView] = useState<'monthly' | 'cumulative'>('monthly');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await manageApiFetch<Data>(`/api/manage/finance/project/${project._id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [project._id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <EmptyState>{t.loading}</EmptyState>;

  const c = data.cumulative;
  const m = data.monthly;
  const showing = view === 'monthly'
    ? { revenue: m.revenue, cost: m.cost, profit: m.profit, margin: m.margin }
    : { revenue: c.revenue, cost: c.totalCost, profit: c.grossProfit, margin: c.margin };

  return (
    <>
      <Tabs>
        <Tab active={view === 'monthly'} onClick={() => setView('monthly')}>{t.viewMonthly}</Tab>
        <Tab active={view === 'cumulative'} onClick={() => setView('cumulative')}>{t.viewCumulative}</Tab>
      </Tabs>

      <Panel style={{ marginBottom: 18 }}>
        <Strip>
          <Stat>
            <StatLabel>{t.revenue}</StatLabel>
            <StatValue>{formatMoney(showing.revenue)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t.cost}</StatLabel>
            <StatValue>{formatMoney(showing.cost)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t.profit}</StatLabel>
            <StatValue tone={showing.profit < 0 ? HEALTH_COLORS.red : HEALTH_COLORS.green}>
              {formatMoney(showing.profit)}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t.margin}</StatLabel>
            <StatValue tone={showing.margin < 0 ? HEALTH_COLORS.red : undefined}>
              {formatPercent(showing.margin)}
            </StatValue>
          </Stat>
        </Strip>

        <Breakdown>
          <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginBottom: 8 }}>
            {view === 'monthly' ? t.monthlyHint : t.cumulativeHint}
          </div>
          {view === 'cumulative' && (
            <>
              <Line><span>{t.oneTime}</span><span>{formatMoney(c.oneTimeRevenue)}</span></Line>
              {c.recurringToDate > 0 && (
                <Line><span>{t.recurringToDate}</span><span>{formatMoney(c.recurringToDate)}</span></Line>
              )}
              <Line><span>{t.laborCost}</span><span>−{formatMoney(c.laborCost)}</span></Line>
              <Line><span>{t.expenseTotal}</span><span>−{formatMoney(c.expenseTotal)}</span></Line>
              <Line strong><span>{t.profit}</span><span>{formatMoney(c.grossProfit)}</span></Line>
              <Line>
                <span>{t.effectiveRate}</span>
                <span>{formatMoney(c.effectiveRatePerHour)} / {data.actualHours}h</span>
              </Line>
            </>
          )}
        </Breakdown>

        <Caveat>{t.excludesManagement}</Caveat>
      </Panel>

      <ExpensesPanel projectId={project._id} onChanged={load} />
      <ChangeRequestsPanel projectId={project._id} onChanged={load} />
    </>
  );
}
