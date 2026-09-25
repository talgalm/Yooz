import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageProjectsPage.i18n';
import ProjectFormModal from './ProjectFormModal';
import { Table } from '../../../components/styled';
import {
  Project, PROJECT_STATUSES, PROJECT_TYPES, HEALTH_COLORS, isClosed, formatDate,
} from '../manageTypes';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, SmallInput, SmallSelect,
  Button, Pill, EmptyState, ErrorNote, MOBILE,
} from '../manageUi';

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

const HealthDot = styled('span')<{ tone: string }>(({ tone }) => ({
  display: 'inline-block',
  width: 9,
  height: 9,
  borderRadius: '50%',
  background: tone,
  marginInlineEnd: 8,
  flexShrink: 0,
}));

const NameCell = styled('td')<{ dim?: boolean }>(({ dim }) => ({
  fontWeight: 600,
  opacity: dim ? 0.55 : 1,
}));

export default function ManageProjectsPage() {
  const t = useTranslations(texts);
  const navigate = useNavigate();
  const { user } = useManageAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'pm';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [billing, setBilling] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (billing) params.set('billing', billing);
      const res = await manageApiFetch<{ projects: Project[] }>(`/api/manage/projects?${params}`);
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, status, type, billing]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
        {canEdit && <Button onClick={() => setShowForm(true)}>{t.newProject}</Button>}
      </PageHeader>

      <Toolbar>
        <SmallInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          style={{ flex: '1 1 180px' }}
        />
        <SmallSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.allStatuses}</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
        </SmallSelect>
        <SmallSelect value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t.allTypes}</option>
          {PROJECT_TYPES.map((x) => <option key={x} value={x}>{t.types[x]}</option>)}
        </SmallSelect>
        {canEdit && (
          <SmallSelect value={billing} onChange={(e) => setBilling(e.target.value)}>
            <option value="">{t.allBilling}</option>
            <option value="one_time">{t.oneTime}</option>
            <option value="recurring">{t.recurring}</option>
          </SmallSelect>
        )}
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : projects.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <DesktopHead>{t.client}</DesktopHead>
                  <th>{t.status}</th>
                  <th>{t.hours}</th>
                  <DesktopHead>{t.target}</DesktopHead>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p._id} onClick={() => navigate(`/manage/projects/${p._id}`)}>
                    <NameCell dim={isClosed(p.status)}>
                      <HealthDot tone={HEALTH_COLORS[p.health]} title={p.healthReason ?? ''} />
                      {p.name}
                    </NameCell>
                    <DesktopCell>
                      {p.type === 'client' ? (p.clientName ?? '—') : t.types[p.type]}
                    </DesktopCell>
                    <td>
                      <Pill tone={p.status === 'active' ? 'default' : 'muted'}>{t.statuses[p.status]}</Pill>
                      {canEdit && p.recurring?.enabled && <> <Pill tone="muted">{t.recurring}</Pill></>}
                    </td>
                    <td>
                      {p.hours ? `${p.hours.actualHours} ${t.ofPlanned} ${p.hours.plannedHours}` : p.plannedHours}
                    </td>
                    <DesktopCell>{p.targetDate ? formatDate(p.targetDate) : '—'}</DesktopCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Panel>

      {showForm && (
        <ProjectFormModal
          onClose={() => setShowForm(false)}
          onSaved={(p) => { setShowForm(false); navigate(`/manage/projects/${p._id}`); }}
        />
      )}
    </>
  );
}
