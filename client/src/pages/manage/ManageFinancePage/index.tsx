import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import PaymentsPanel from './PaymentsPanel';
import RatesPanel from './RatesPanel';
import ExpensesPanel from '../ManageProjectPage/ExpensesPanel';
import { FinanceSummary, HEALTH_COLORS, formatMoney, formatPercent, formatDate } from '../manageTypes';
import { Table } from '../../../components/styled';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  PageHeader, SectionTitle, Panel, TableScroll, EmptyState, ErrorNote, MOBILE,
} from '../manageUi';

const Stats = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12, marginBottom: 18,
});
const StatCard = styled('div')({
  background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
});
const StatLabel = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT });
const StatValue = styled('div')<{ tone?: string }>(({ tone }) => ({
  fontSize: 22, fontWeight: 700, marginTop: 4, color: tone ?? 'inherit',
}));
const Sub = styled('div')({ fontSize: 12, color: TEXT_LIGHT, marginTop: 2 });

const Block = styled('div')({ marginBottom: 22 });
const BlockTitle = styled('h2')({ margin: '0 0 10px', fontSize: 16, fontWeight: 700 });
const Note = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 8 });

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

const Row = styled('div')({
  display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
  padding: '10px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});

export default function ManageFinancePage() {
  const t = useTranslations(texts);
  const navigate = useNavigate();
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => manageApiFetch<FinanceSummary>('/api/manage/finance/summary')
    .then(setData)
    .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <EmptyState>{t.loading}</EmptyState>;

  const clientProjects = data.projects.filter((p) => p.type === 'client');

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.finance}</SectionTitle>
      </PageHeader>

      <Stats>
        <StatCard>
          <StatLabel>{t.revenue}</StatLabel>
          <StatValue>{formatMoney(data.totals.revenue)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{t.totalCost}</StatLabel>
          <StatValue>{formatMoney(data.totals.cost)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{t.profit}</StatLabel>
          <StatValue tone={data.totals.profit < 0 ? HEALTH_COLORS.red : HEALTH_COLORS.green}>
            {formatMoney(data.totals.profit)}
          </StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{t.mrr}</StatLabel>
          <StatValue>{formatMoney(data.mrr)}</StatValue>
          <Sub>{t.arr}: {formatMoney(data.arr)}</Sub>
        </StatCard>
        <StatCard>
          <StatLabel>{t.monthLabor}</StatLabel>
          <StatValue>{formatMoney(data.monthLaborCost)}</StatValue>
        </StatCard>
      </Stats>

      <Block>
        <BlockTitle>{t.projectProfitability}</BlockTitle>
        <Panel>
          {clientProjects.length === 0 ? (
            <EmptyState>—</EmptyState>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <th>{t.project}</th>
                    <th>{t.revenue}</th>
                    <th>{t.cost}</th>
                    <th>{t.profit}</th>
                    <DesktopHead>{t.margin}</DesktopHead>
                    <DesktopHead>{t.effectiveRate}</DesktopHead>
                  </tr>
                </thead>
                <tbody>
                  {clientProjects.map((p) => (
                    <tr key={p._id} onClick={() => navigate(`/manage/projects/${p._id}`)}>
                      <td style={{ fontWeight: 600 }}>
                        {p.name}
                        {p.clientName ? <Sub>{p.clientName}</Sub> : null}
                      </td>
                      <td>{formatMoney(p.revenue)}</td>
                      <td>{formatMoney(p.totalCost)}</td>
                      <td style={{ color: p.grossProfit < 0 ? HEALTH_COLORS.red : HEALTH_COLORS.green, fontWeight: 600 }}>
                        {formatMoney(p.grossProfit)}
                      </td>
                      <DesktopCell>{formatPercent(p.margin)}</DesktopCell>
                      <DesktopCell>{p.actualHours > 0 ? formatMoney(p.effectiveRatePerHour) : '—'}</DesktopCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
        <Note>{t.excludesManagement}</Note>
      </Block>

      <Block>
        <BlockTitle>{t.payments}</BlockTitle>
        <PaymentsPanel onChanged={load} />
      </Block>

      <Block>
        <BlockTitle>{t.expenses}</BlockTitle>
        <ExpensesPanel onChanged={load} />
      </Block>

      <Block>
        <BlockTitle>{t.employeeCost}</BlockTitle>
        <RatesPanel />
      </Block>

      <Block>
        <BlockTitle>{t.internalInvestment}</BlockTitle>
        <Panel>
          <Row>
            <b>{t.totalCost}</b>
            <b>{formatMoney(data.internalInvestment.totalCost)}</b>
          </Row>
          <Row>
            <span>{t.actualHours}</span>
            <span>{data.internalInvestment.hours}</span>
          </Row>
          {data.internalInvestment.rows.map((r) => (
            <Row key={r._id}>
              <span>{r.name}</span>
              <span>{formatMoney(r.totalCost)} · {r.actualHours}h</span>
            </Row>
          ))}
        </Panel>
        <Note>{t.internalNote}</Note>
      </Block>

      <Block>
        <BlockTitle>{t.endingSoon}</BlockTitle>
        <Panel>
          {data.endingSoon.length === 0 ? (
            <EmptyState>{t.noEndingSoon}</EmptyState>
          ) : (
            data.endingSoon.map((c) => (
              <Row key={c._id}>
                <span>{c.name}{c.clientName ? ` · ${c.clientName}` : ''}</span>
                <b>{formatDate(c.endDate)}</b>
              </Row>
            ))
          )}
        </Panel>
      </Block>
    </>
  );
}
