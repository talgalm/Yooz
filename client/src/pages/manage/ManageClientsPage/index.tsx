import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientsPage.i18n';
import ClientFormModal from './ClientFormModal';
import { Table } from '../../../components/styled';
import {
  Client, Contact, CLIENT_STATUSES, CLIENT_DOMAINS, daysSince, formatDate,
} from '../manageTypes';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, SmallInput, SmallSelect,
  Button, Pill, EmptyState, ErrorNote, MOBILE,
} from '../manageUi';
import { styled } from '@mui/material/styles';

/** Columns that add context but are not worth a sideways scroll on a phone. */
const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

const SortButton = styled('button')({
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

type SortKey = 'name' | 'status' | 'contacts' | 'lastContact';

/** CLIENT_STATUSES is already ordered active → prospect → … → irrelevant. */
const sortValue = (c: Client, key: SortKey): string | number => {
  if (key === 'name') return c.name;
  if (key === 'status') return CLIENT_STATUSES.indexOf(c.status);
  if (key === 'contacts') return c.contacts.length;
  return c.lastContactDate ? Date.parse(c.lastContactDate) : 0; // never contacted sorts first
};

const phoneOf = (p: Contact) => p.phone || p.officePhone;

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
  const [archived, setArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // Active first, then prospects and so on — the same order as CLIENT_STATUSES.
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'status', dir: 1 });

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      if (domain) params.set('domain', domain);
      if (archived) params.set('archived', 'true');
      const res = await manageApiFetch<{ clients: Client[] }>(`/api/manage/clients?${params}`);
      setClients(res.clients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, status, domain, archived]);

  const sorted = useMemo(() => [...clients].sort((a, b) => {
    const [x, y] = [sortValue(a, sort.key), sortValue(b, sort.key)];
    const cmp = typeof x === 'string' ? x.localeCompare(String(y), 'he') : Number(x) - Number(y);
    // Ties fall back to the oldest contact first — the "who have we forgotten" order.
    return cmp * sort.dir || Number(sortValue(a, 'lastContact')) - Number(sortValue(b, 'lastContact'));
  }), [clients, sort]);

  const SortHead = ({ column, label, desktopOnly }: { column: SortKey; label: string; desktopOnly?: boolean }) => {
    const Head = desktopOnly ? DesktopHead : 'th';
    return (
      <Head>
        <SortButton
          onClick={() => setSort((s) => ({ key: column, dir: s.key === column && s.dir === 1 ? -1 : 1 }))}
        >
          {label}{sort.key === column ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
        </SortButton>
      </Head>
    );
  };

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  /** The person you would actually call: primary contact, name and number. */
  const contactLabel = (c: Client) => {
    const [first] = [...c.contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    if (!first) return '—';
    const rest = c.contacts.length - 1;
    return [first.name, phoneOf(first), rest > 0 && t.moreContacts(rest)].filter(Boolean).join(' · ');
  };

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
        <SmallSelect value={archived ? 'archived' : 'live'} onChange={(e) => setArchived(e.target.value === 'archived')}>
          <option value="live">{t.liveClients}</option>
          <option value="archived">{t.archivedClients}</option>
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
                  <SortHead column="name" label={t.name} />
                  <SortHead column="status" label={t.status} />
                  <DesktopHead>{t.domain}</DesktopHead>
                  <SortHead column="contacts" label={t.contacts} desktopOnly />
                  <SortHead column="lastContact" label={t.lastContact} />
                  <DesktopHead>{t.nextAction}</DesktopHead>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c._id} onClick={() => navigate(`/manage/clients/${c._id}`)}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><Pill tone={c.status === 'active' ? 'default' : 'muted'}>{t.statuses[c.status]}</Pill></td>
                    <DesktopCell>{t.domains[c.domain]}</DesktopCell>
                    <DesktopCell>{contactLabel(c)}</DesktopCell>
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
