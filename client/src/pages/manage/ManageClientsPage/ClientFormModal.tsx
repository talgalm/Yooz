import { useState, FormEvent } from 'react';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientsPage.i18n';
import {
  Client,
  CLIENT_DOMAINS,
  CLIENT_STATUSES,
  LEAD_SOURCES,
  ClientDomain,
  ClientStatus,
  LeadSource,
} from '../manageTypes';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  Button, GhostButton, ErrorNote,
} from '../manageUi';

interface Props {
  client?: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

/** Create and edit share one form — the fields are identical. */
export default function ClientFormModal({ client, onClose, onSaved }: Props) {
  const t = useTranslations(texts);
  const [name, setName] = useState(client?.name ?? '');
  const [domain, setDomain] = useState<ClientDomain>(client?.domain ?? 'other');
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'prospect');
  const [leadSource, setLeadSource] = useState<LeadSource>(client?.leadSource ?? 'existing');
  const [website, setWebsite] = useState(client?.website ?? '');
  const [driveUrl, setDriveUrl] = useState(client?.driveUrl ?? '');
  const [notes, setNotes] = useState(client?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = JSON.stringify({ name, domain, status, leadSource, website, driveUrl, notes });
      const res = await manageApiFetch<{ client: Client }>(
        client ? `/api/manage/clients/${client._id}` : '/api/manage/clients',
        { method: client ? 'PATCH' : 'POST', body },
      );
      onSaved(res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{client ? t.editTitle : t.createTitle}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.fieldName}
              <SmallInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <Field>
              {t.fieldDomain}
              <SmallSelect value={domain} onChange={(e) => setDomain(e.target.value as ClientDomain)}>
                {CLIENT_DOMAINS.map((d) => <option key={d} value={d}>{t.domains[d]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.fieldStatus}
              <SmallSelect value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
                {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.fieldSource}
              <SmallSelect value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{t.sources[s]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.fieldWebsite}
              <SmallInput value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </Field>
            <Field>
              {t.fieldDrive}
              <SmallInput value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
          </FieldGrid>
          <Field style={{ marginTop: 14 }}>
            {t.fieldNotes}
            <SmallTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
