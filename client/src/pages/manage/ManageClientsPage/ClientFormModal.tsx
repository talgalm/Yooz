import { useState, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
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
  toDateInput,
} from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  Button, GhostButton, ErrorNote,
} from '../manageUi';

const Section = styled('div')({ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` });
const SectionTitle = styled('div')({ fontSize: 13, fontWeight: 700, color: TEXT_LIGHT });
const Hint = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 4 });

/** A blank contact row. Two of them ship with the form — most clients arrive with two names. */
const emptyContact = { name: '', role: '', email: '', phone: '', officePhone: '' };
type ContactDraft = typeof emptyContact;

interface Props {
  client?: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

/** Create and edit share one form — the fields are identical. */
export default function ClientFormModal({ client, onClose, onSaved }: Props) {
  const t = useTranslations(texts);
  const { isOwner } = useManageAuth();
  const [name, setName] = useState(client?.name ?? '');
  const [domain, setDomain] = useState<ClientDomain>(client?.domain ?? 'other');
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'prospect');
  const [leadSource, setLeadSource] = useState<LeadSource>(client?.leadSource ?? 'existing');
  const [website, setWebsite] = useState(client?.website ?? '');
  const [driveUrl, setDriveUrl] = useState(client?.driveUrl ?? '');
  const [brief, setBrief] = useState(client?.brief ?? '');
  const [notes, setNotes] = useState(client?.notes ?? '');
  const [contacts, setContacts] = useState<ContactDraft[]>([{ ...emptyContact }, { ...emptyContact }]);
  const [contract, setContractState] = useState({
    startDate: client?.contract?.startDate ? toDateInput(client.contract.startDate) : '',
    endDate: client?.contract?.endDate ? toDateInput(client.contract.endDate) : '',
    initialFee: client?.contract?.initialFee != null ? String(client.contract.initialFee) : '',
    monthlyFee: client?.contract?.monthlyFee != null ? String(client.contract.monthlyFee) : '',
    notes: client?.contract?.notes ?? '',
  });
  const setContract = (patch: Partial<typeof contract>) => setContractState((c) => ({ ...c, ...patch }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setContact = (i: number, patch: Partial<ContactDraft>) =>
    setContacts((cs) => cs.map((c, n) => (n === i ? { ...c, ...patch } : c)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = JSON.stringify({
        name, domain, status, leadSource, website, driveUrl, brief, notes,
        // The server ignores this for anyone but the owner; do not even send it.
        ...(isOwner ? {
          contract: {
            ...contract,
            initialFee: Number(contract.initialFee) || 0,
            monthlyFee: Number(contract.monthlyFee) || 0,
          },
        } : {}),
        // Existing clients manage their contacts on the client page, not here.
        ...(client ? {} : { contacts: contacts.filter((c) => c.name.trim()) }),
      });
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
            {t.fieldBrief}
            <SmallTextarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} />
            <Hint>{t.briefHint}</Hint>
          </Field>
          <Field style={{ marginTop: 14 }}>
            {t.fieldNotes}
            <SmallTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {isOwner && (
            <Section>
              <SectionTitle>{t.contractTitle}</SectionTitle>
              <Hint>{t.contractHint}</Hint>
              <FieldGrid style={{ marginTop: 12 }}>
                <Field>
                  {t.contractStart}
                  <SmallInput
                    type="date" value={contract.startDate}
                    onChange={(e) => setContract({ startDate: e.target.value })}
                  />
                </Field>
                <Field>
                  {t.contractEnd}
                  <SmallInput
                    type="date" value={contract.endDate}
                    onChange={(e) => setContract({ endDate: e.target.value })}
                  />
                </Field>
                <Field>
                  {t.initialFee}
                  <SmallInput
                    type="number" min="0" step="1" value={contract.initialFee}
                    onChange={(e) => setContract({ initialFee: e.target.value })}
                  />
                </Field>
                <Field>
                  {t.monthlyFee}
                  <SmallInput
                    type="number" min="0" step="1" value={contract.monthlyFee}
                    onChange={(e) => setContract({ monthlyFee: e.target.value })}
                  />
                </Field>
              </FieldGrid>
              <Field style={{ marginTop: 12 }}>
                {t.contractNotes}
                <SmallInput
                  value={contract.notes}
                  onChange={(e) => setContract({ notes: e.target.value })}
                />
              </Field>
            </Section>
          )}

          {!client && (
            <Section>
              <SectionTitle>{t.contactsTitle}</SectionTitle>
              <Hint>{t.contactsHint}</Hint>
              {contacts.map((c, i) => (
                <FieldGrid key={i} style={{ marginTop: 12 }}>
                  <Field>
                    {t.contactName}
                    <SmallInput
                      value={c.name}
                      onChange={(e) => setContact(i, { name: e.target.value })}
                    />
                  </Field>
                  <Field>
                    {t.contactRole}
                    <SmallInput value={c.role} onChange={(e) => setContact(i, { role: e.target.value })} />
                  </Field>
                  <Field>
                    {t.contactEmail}
                    <SmallInput
                      type="email" value={c.email}
                      onChange={(e) => setContact(i, { email: e.target.value })}
                    />
                  </Field>
                  <Field>
                    {t.contactMobile}
                    <SmallInput
                      type="tel" value={c.phone}
                      onChange={(e) => setContact(i, { phone: e.target.value })}
                    />
                  </Field>
                  <Field>
                    {t.contactOffice}
                    <SmallInput
                      type="tel" value={c.officePhone}
                      onChange={(e) => setContact(i, { officePhone: e.target.value })}
                    />
                  </Field>
                </FieldGrid>
              ))}
              <GhostButton
                type="button"
                style={{ marginTop: 12 }}
                onClick={() => setContacts((cs) => [...cs, { ...emptyContact }])}
              >
                +
              </GhostButton>
            </Section>
          )}
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
