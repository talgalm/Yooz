import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageProjectPage.i18n';
import { texts as listTexts } from '../ManageProjectsPage/ManageProjectsPage.i18n';
import ProjectFormModal from '../ManageProjectsPage/ProjectFormModal';
import StagesTab from './StagesTab';
import TasksTab from './TasksTab';
import MoneyTab from './MoneyTab';
import ConfirmDialog from '../ConfirmDialog';
import {
  Project, ProjectHours, ProjectStatus, PROJECT_STATUSES, TeamMember, Client,
  HEALTH_COLORS, formatDate,
} from '../manageTypes';
import { PRIMARY, TEXT_LIGHT, BORDER } from '../../../components/styled';
import {
  PageHeader, PageTitle, Panel, Tabs, Tab, GhostButton, DangerButton, Pill,
  EmptyState, ErrorNote, FieldGrid, ReadField, SmallSelect, MOBILE,
} from '../manageUi';

const BackLink = styled(Link)({
  fontSize: 13, color: TEXT_LIGHT, textDecoration: 'none',
  display: 'inline-block', marginBottom: 10,
  '&:hover': { color: PRIMARY },
});

const TitleLine = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' });
const HeaderActions = styled('div')({ display: 'flex', gap: 8, flexWrap: 'wrap' });

const HealthDot = styled('span')<{ tone: string }>(({ tone }) => ({
  display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: tone,
}));

const Body = styled('div')({ padding: 20 });

const HoursStrip = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 14,
  padding: 20,
  borderBottom: `1px solid ${BORDER}`,
});

const Stat = styled('div')({ display: 'flex', flexDirection: 'column', gap: 3 });
const StatLabel = styled('span')({ fontSize: 12.5, color: TEXT_LIGHT });
const StatValue = styled('b')({ fontSize: 22, fontWeight: 700 });

const Bar = styled('div')({
  height: 8, borderRadius: 999, background: '#eeecf5', overflow: 'hidden', marginTop: 10,
});
const BarFill = styled('div')<{ pct: number; tone: string }>(({ pct, tone }) => ({
  height: '100%', width: `${Math.min(100, pct)}%`, background: tone,
}));

const Note = styled('div')({ padding: '0 20px 18px', fontSize: 12.5, color: TEXT_LIGHT });
const StatusRow = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  padding: 20, borderTop: `1px solid ${BORDER}`,
  [MOBILE]: { padding: 16 },
});

interface Loaded {
  project: Project;
  hours: ProjectHours;
  client: (Pick<Client, '_id' | 'name' | 'contacts'>) | null;
  team: TeamMember[];
}

export default function ManageProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const lt = useTranslations(listTexts);
  const { user } = useManageAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'pm';
  const isOwner = user?.role === 'owner';

  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'stages' | 'tasks' | 'money'>('overview');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = () => manageApiFetch<Loaded>(`/api/manage/projects/${id}`)
    .then(setData)
    .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (next: ProjectStatus) => {
    setError('');
    setBusy(true);
    try {
      const res = await manageApiFetch<{ project: Project }>(`/api/manage/projects/${id}`, {
        method: 'PATCH', body: JSON.stringify({ status: next }),
      });
      setData((d) => (d ? { ...d, project: res.project } : d));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      // The server answers with a code so the UI can say something useful.
      setError(msg === 'needs_go_live_date' ? t.needsGoLive : msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await manageApiFetch(`/api/manage/projects/${id}`, { method: 'DELETE' });
      navigate('/manage/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setBusy(false);
    }
  };

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (!data) return <>{error ? <ErrorNote>{error}</ErrorNote> : <EmptyState>{t.notFound}</EmptyState>}</>;

  const { project: p, hours, client, team } = data;
  const pm = team.find((m) => m._id === String(p.pmUserId));
  const contact = client?.contacts?.find((c) => c._id === p.primaryContactId);
  const utilPct = Math.round(hours.utilization * 100);

  return (
    <>
      <BackLink to="/manage/projects">{t.back}</BackLink>
      <PageHeader>
        <TitleLine>
          <HealthDot tone={HEALTH_COLORS[p.health]} title={p.healthReason ?? ''} />
          <PageTitle>{p.name}</PageTitle>
          <Pill tone={p.status === 'active' ? 'default' : 'muted'}>{lt.statuses[p.status]}</Pill>
          {p.healthReason && <Pill tone="warn">{p.healthReason}</Pill>}
        </TitleLine>
        <HeaderActions>
          {canEdit && <GhostButton onClick={() => setEditing(true)}>{t.edit}</GhostButton>}
          {isOwner && <DangerButton onClick={() => setConfirmingDelete(true)} disabled={busy}>{t.deleteProject}</DangerButton>}
        </HeaderActions>
      </PageHeader>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Tabs>
        <Tab active={tab === 'overview'} onClick={() => setTab('overview')}>{t.tabOverview}</Tab>
        <Tab active={tab === 'stages'} onClick={() => setTab('stages')}>
          {t.tabStages} ({p.stages.length})
        </Tab>
        <Tab active={tab === 'tasks'} onClick={() => setTab('tasks')}>{t.tabTasks}</Tab>
        {/* Money is owner-only in the UI; the API refuses everyone else regardless. */}
        {isOwner && <Tab active={tab === 'money'} onClick={() => setTab('money')}>{t.tabMoney}</Tab>}
      </Tabs>

      {tab === 'overview' && (
        <Panel>
          <HoursStrip>
            <Stat>
              <StatLabel>{t.plannedHours}</StatLabel>
              <StatValue>{hours.plannedHours}</StatValue>
            </Stat>
            <Stat>
              <StatLabel>{t.actualHours}</StatLabel>
              <StatValue>{hours.actualHours}</StatValue>
            </Stat>
            <Stat>
              <StatLabel>{t.remaining}</StatLabel>
              <StatValue>{hours.remainingHours}</StatValue>
            </Stat>
            <Stat>
              <StatLabel>{t.utilization}</StatLabel>
              <StatValue>{utilPct}%</StatValue>
              <Bar>
                <BarFill pct={utilPct} tone={utilPct > 100 ? HEALTH_COLORS.red : utilPct >= 85 ? HEALTH_COLORS.orange : PRIMARY} />
              </Bar>
            </Stat>
            {hours.overrunHours > 0 && (
              <Stat>
                <StatLabel>{t.overrun}</StatLabel>
                <StatValue style={{ color: HEALTH_COLORS.red }}>{hours.overrunHours}</StatValue>
              </Stat>
            )}
          </HoursStrip>
          <Note>{t.noHoursYet}</Note>

          <Body>
            <FieldGrid>
              <ReadField>
                {t.client}
                <b>
                  {client
                    ? <Link to={`/manage/clients/${client._id}`}>{client.name}</Link>
                    : lt.types[p.type]}
                </b>
              </ReadField>
              <ReadField>{t.contact}<b>{contact?.name ?? t.none}</b></ReadField>
              <ReadField>{t.type}<b>{lt.types[p.type]}</b></ReadField>
              <ReadField>{t.pm}<b>{pm?.name ?? t.none}</b></ReadField>
              <ReadField>{t.start}<b>{p.startDate ? formatDate(p.startDate) : t.none}</b></ReadField>
              <ReadField>{t.target}<b>{p.targetDate ? formatDate(p.targetDate) : t.none}</b></ReadField>
              <ReadField>{t.goLive}<b>{p.goLiveDate ? formatDate(p.goLiveDate) : t.none}</b></ReadField>
              <ReadField>
                {t.billing}
                <b>{p.recurring?.enabled ? t.recurring : t.oneTime}</b>
              </ReadField>
            </FieldGrid>
            {p.description && <div style={{ marginTop: 18, fontSize: 14, whiteSpace: 'pre-wrap' }}>{p.description}</div>}
          </Body>

          {canEdit && (
            <StatusRow>
              <StatLabel>{t.changeStatus}</StatLabel>
              <SmallSelect
                value={p.status}
                disabled={busy}
                onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
              >
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{lt.statuses[s]}</option>)}
              </SmallSelect>
            </StatusRow>
          )}
        </Panel>
      )}

      {tab === 'tasks' && <TasksTab projectId={p._id} />}

      {tab === 'money' && isOwner && <MoneyTab project={p} />}

      {tab === 'stages' && (
        <StagesTab
          project={p}
          canEdit={canEdit}
          onProjectChange={(np) => setData((d) => (d ? { ...d, project: np } : d))}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={t.deleteProject}
          message={t.confirmDelete(p.name)}
          busy={busy}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={remove}
        />
      )}

      {editing && (
        <ProjectFormModal
          project={p}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </>
  );
}
