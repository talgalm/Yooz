import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageDashboardPage.i18n';
import { DashboardData, AlertSeverity, HEALTH_COLORS } from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import { PageHeader, SectionTitle, Panel, EmptyState, ErrorNote } from '../manageUi';

const Stats = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginBottom: 18,
});

const StatCard = styled('div')({
  background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
});
const StatLabel = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT });
const StatValue = styled('div')<{ tone?: string }>(({ tone }) => ({
  fontSize: 26, fontWeight: 700, marginTop: 4, color: tone ?? 'inherit',
}));

const Block = styled('div')({ marginBottom: 22 });
const BlockTitle = styled('h2')({ margin: '0 0 10px', fontSize: 16, fontWeight: 700 });

const SEVERITY: Record<AlertSeverity, { bg: string; fg: string }> = {
  critical: { bg: '#fdecea', fg: '#c62828' },
  warning: { bg: '#fff4e5', fg: '#ed6c02' },
  info: { bg: '#eef4ff', fg: '#0984e3' },
};

const AlertRow = styled(Link)<{ sev: AlertSeverity }>(({ sev }) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '11px 16px',
  borderBottom: `1px solid ${BORDER}`,
  textDecoration: 'none',
  color: 'inherit',
  fontSize: 14,
  '&:last-child': { borderBottom: 'none' },
  '&:hover': { background: '#fafaff' },
  '&::before': {
    content: '""', width: 8, height: 8, borderRadius: '50%',
    background: SEVERITY[sev].fg, flexShrink: 0,
  },
}));

const Waiting = styled('span')<{ hot?: boolean }>(({ hot }) => ({
  marginInlineStart: 'auto',
  fontSize: 12.5,
  fontWeight: 700,
  color: hot ? '#c62828' : TEXT_LIGHT,
  whiteSpace: 'nowrap',
}));


/**
 * "Not what is happening — what I need to act on."
 * Counts first, then the exceptions. Anything that does not lead to an action
 * belongs in a report, not here.
 */
export default function ManageDashboardPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<DashboardData>('/api/manage/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <EmptyState>{t.empty}</EmptyState>;

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
      </PageHeader>

      <Stats>
        <StatCard>
          <StatLabel>{t.myOpenTasks}</StatLabel>
          <StatValue>{data.my.openTasks}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{t.myOverdue}</StatLabel>
          <StatValue tone={data.my.overdueTasks > 0 ? HEALTH_COLORS.red : undefined}>
            {data.my.overdueTasks}
          </StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{t.myWeekHours}</StatLabel>
          <StatValue>{data.my.weekHours}</StatValue>
        </StatCard>
        {data.business && (
          <>
            <StatCard>
              <StatLabel>{t.activeProjects}</StatLabel>
              <StatValue>{data.business.activeProjects}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t.projectHealth}</StatLabel>
              <StatValue style={{ fontSize: 18 }}>
                <span style={{ color: HEALTH_COLORS.green }}>{data.business.health.green}</span>
                {' · '}
                <span style={{ color: HEALTH_COLORS.orange }}>{data.business.health.orange}</span>
                {' · '}
                <span style={{ color: HEALTH_COLORS.red }}>{data.business.health.red}</span>
              </StatValue>
            </StatCard>
          </>
        )}
      </Stats>

      <Block>
        <BlockTitle>{t.needsAttention} ({data.alerts.length})</BlockTitle>
        <Panel>
          {data.alerts.length === 0 ? (
            <EmptyState>{t.allClear}</EmptyState>
          ) : (
            data.alerts.map((a, i) => (
              <AlertRow key={`${a.key}-${a.entityId}-${i}`} to={a.href} sev={a.severity}>
                <span>{a.title}</span>
                <Waiting hot={a.severity === 'critical'}>{t.severities[a.severity]}</Waiting>
              </AlertRow>
            ))
          )}
        </Panel>
      </Block>

      <div style={{ fontSize: 12.5, color: TEXT_LIGHT }}>
        {user?.role === 'member' ? t.memberScope : t.managerScope}
      </div>
    </>
  );
}
