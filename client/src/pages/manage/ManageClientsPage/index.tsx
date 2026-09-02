import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientsPage.i18n';
import ClientFormModal from './ClientFormModal';
import { Table } from '../../../components/styled';
import {
  Client, CLIENT_STATUSES, CLIENT_DOMAINS, daysSince, formatDate,
} from '../manageTypes';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, SmallInput, SmallSelect,
  Button, Pill, EmptyState, ErrorNote, MOBILE,
} from '../manageUi';
import { styled } from '@mui/material/styles';

/** Columns that add context but are not worth a sideways scroll on a phone. */
const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

export default function ManageClientsPage() {
  const t = useTranslations(texts);
  const navigate = useNavigate();
  const { user } = useManageAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'pm';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [domain, setDomain] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      if (domain) params.set('domain', domain);
      const res = await manageApiFetch<{ clients: Client[] }>(`/api/manage/clients?${params}`);
      setClients(res.clients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, status, domain]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const lastContactLabel = (c: Client) => {
    const days = daysSince(c.lastContactDate);
    if (days === null) return t.never;
    if (days === 0) return t.today;
    return `${formatDate(c.lastContactDate)} · ${t.daysAgo(days)}`;
  };

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
        {canEdit && <Button onClick={() => setShowForm(true)}>{t.newClient}</Button>}
      </PageHeader>

      <Toolbar>
        <SmallInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          style={{ flex: '1 1 200px' }}
        />
        <SmallSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.allStatuses}</option>
          {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
        </SmallSelect>
        <SmallSelect value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">{t.allDomains}</option>
          {CLIENT_DOMAINS.map((d) => <option key={d} value={d}>{t.domains[d]}</option>)}
        </SmallSelect>
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : clients.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.status}</th>
                  <DesktopHead>{t.domain}</DesktopHead>
                  <DesktopHead>{t.contacts}</DesktopHead>
                  <th>{t.lastContact}</th>
                  <DesktopHead>{t.nextAction}</DesktopHead>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c._id} onClick={() => navigate(`/manage/clients/${c._id}`)}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><Pill tone={c.status === 'active' ? 'default' : 'muted'}>{t.statuses[c.status]}</Pill></td>
                    <DesktopCell>{t.domains[c.domain]}</DesktopCell>
                    <DesktopCell>{c.contacts.length || '—'}</DesktopCell>
                    <td>
                      {lastContactLabel(c)}
                    </td>
                    <DesktopCell>
                      {c.nextActionText
                        ? `${c.nextActionText}${c.nextActionDate ? ` · ${formatDate(c.nextActionDate)}` : ''}`
                        : '—'}
                    </DesktopCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Panel>

      {showForm && (
        <ClientFormModal
          onClose={() => setShowForm(false)}
          onSaved={(c) => { setShowForm(false); navigate(`/manage/clients/${c._id}`); }}
        />
      )}
    </>
  );
}
