import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientPage.i18n';
import { texts as listTexts } from '../ManageClientsPage/ManageClientsPage.i18n';
import ClientFormModal from '../ManageClientsPage/ClientFormModal';
import ContactsTab from './ContactsTab';
import InteractionsTab from './InteractionsTab';
import ConfirmDialog from '../ConfirmDialog';
import { Client, daysSince, isStale, formatDate } from '../manageTypes';
import { PRIMARY, TEXT_LIGHT } from '../../../components/styled';
import {
  PageHeader, PageTitle, Panel, Tabs, Tab, GhostButton, DangerButton, Pill,
  EmptyState, ErrorNote, FieldGrid, ReadField,
} from '../manageUi';

const BackLink = styled(Link)({
  fontSize: 13,
  color: TEXT_LIGHT,
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: 10,
  '&:hover': { color: PRIMARY },
});

const TitleLine = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' });
const HeaderActions = styled('div')({ display: 'flex', gap: 8, flexWrap: 'wrap' });
const DetailsBody = styled('div')({ padding: 20 });
const Notes = styled('div')({ marginTop: 18, fontSize: 14, whiteSpace: 'pre-wrap' });

type TabKey = 'details' | 'contacts' | 'interactions';

export default function ManageClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const lt = useTranslations(listTexts);
  const { user } = useManageAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'pm';
  const isOwner = user?.role === 'owner';

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('details');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const remove = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      await manageApiFetch(`/api/manage/clients/${client._id}`, { method: 'DELETE' });
      navigate('/manage/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setDeleting(false);
    }
  };

  useEffect(() => {
    manageApiFetch<{ client: Client }>(`/api/manage/clients/${id}`)
      .then((res) => setClient(res.client))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!client) return <EmptyState>{t.notFound}</EmptyState>;

  const days = daysSince(client.lastContactDate);
  const lastContact = days === null
    ? t.never
    : `${formatDate(client.lastContactDate)}${days > 0 ? ` · ${lt.daysAgo(days)}` : ''}`;

  return (
    <>
      <BackLink to="/manage/clients">{t.back}</BackLink>
      <PageHeader>
        <TitleLine>
          <PageTitle>{client.name}</PageTitle>
          <Pill tone={client.status === 'active' ? 'default' : 'muted'}>{lt.statuses[client.status]}</Pill>
          {isStale(client) && <Pill tone="warn">{t.stale}</Pill>}
        </TitleLine>
        <HeaderActions>
          {canEdit && <GhostButton onClick={() => setEditing(true)}>{t.edit}</GhostButton>}
          {isOwner && (
            <DangerButton onClick={() => setConfirmingDelete(true)} disabled={deleting}>{t.deleteClient}</DangerButton>
          )}
        </HeaderActions>
      </PageHeader>

      <Tabs>
        <Tab active={tab === 'details'} onClick={() => setTab('details')}>{t.tabDetails}</Tab>
        <Tab active={tab === 'contacts'} onClick={() => setTab('contacts')}>
          {t.tabContacts} ({client.contacts.length})
        </Tab>
        <Tab active={tab === 'interactions'} onClick={() => setTab('interactions')}>{t.tabInteractions}</Tab>
      </Tabs>

      {tab === 'details' && (
        <Panel>
          <DetailsBody>
            <FieldGrid>
              <ReadField>{t.domain}<b>{lt.domains[client.domain]}</b></ReadField>
              <ReadField>{t.status}<b>{lt.statuses[client.status]}</b></ReadField>
              <ReadField>{t.source}<b>{lt.sources[client.leadSource]}</b></ReadField>
              <ReadField>{t.lastContact}<b>{lastContact}</b></ReadField>
              <ReadField>
                {t.nextAction}
                <b>
                  {client.nextActionText
                    ? `${client.nextActionText}${client.nextActionDate ? ` · ${formatDate(client.nextActionDate)}` : ''}`
                    : t.none}
                </b>
              </ReadField>
              <ReadField>
                {t.website}
                <b>{client.website ? <a href={client.website} target="_blank" rel="noreferrer">{client.website}</a> : t.none}</b>
              </ReadField>
              <ReadField>
                {t.drive}
                <b>{client.driveUrl ? <a href={client.driveUrl} target="_blank" rel="noreferrer">Drive</a> : t.none}</b>
              </ReadField>
            </FieldGrid>
            {client.notes && <Notes>{client.notes}</Notes>}
          </DetailsBody>
        </Panel>
      )}

      {tab === 'contacts' && (
        <ContactsTab client={client} canEdit={canEdit} onClientChange={setClient} />
      )}

      {tab === 'interactions' && (
        <InteractionsTab client={client} onClientChange={setClient} />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={t.deleteClient}
          message={t.confirmDeleteClient(client.name)}
          busy={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={remove}
        />
      )}

      {editing && (
        <ClientFormModal
          client={client}
          onClose={() => setEditing(false)}
          onSaved={(c) => { setEditing(false); setClient(c); }}
        />
      )}
    </>
  );
}
