import { useState, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientPage.i18n';
import { Client } from '../manageTypes';
import ConfirmDialog from '../ConfirmDialog';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, LinkButton, Pill, ErrorNote,
  FieldGrid, Field, SmallInput, ModalBackdrop, ModalCard, ModalTitle, ModalActions,
} from '../manageUi';

const Row = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 18px',
  borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
  flexWrap: 'wrap',
});

const Meta = styled('div')({ fontSize: 13, color: TEXT_LIGHT, marginTop: 3 });
const NameLine = styled('div')({ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' });
const CheckLine = styled('label')({
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 14, cursor: 'pointer',
});

interface Props {
  client: Client;
  canEdit: boolean;
  onClientChange: (c: Client) => void;
}

export default function ContactsTab({ client, canEdit, onClientChange }: Props) {
  const t = useTranslations(texts);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState('');

  const remove = async (contactId: string) => {
    setError('');
    try {
      const res = await manageApiFetch<{ client: Client }>(
        `/api/manage/clients/${client._id}/contacts/${contactId}`,
        { method: 'DELETE' },
      );
      onClientChange(res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <>
      {error && <ErrorNote>{error}</ErrorNote>}
      {canEdit && (
        <div style={{ marginBottom: 14 }}>
          <Button onClick={() => setAdding(true)}>{t.addContact}</Button>
        </div>
      )}
      <Panel>
        {client.contacts.length === 0 ? (
          <EmptyState>{t.noContacts}</EmptyState>
        ) : (
          client.contacts.map((c) => (
            <Row key={c._id}>
              <div>
                <NameLine>
                  {c.name}
                  {c.isPrimary && <Pill>{t.primary}</Pill>}
                </NameLine>
                {c.role && <Meta>{c.role}</Meta>}
                <Meta>
                  {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                  {c.phone && (c.officePhone || c.email) && ' · '}
                  {c.officePhone && <a href={`tel:${c.officePhone}`}>{c.officePhone}</a>}
                  {c.officePhone && c.email && ' · '}
                  {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                  {!c.phone && !c.officePhone && !c.email && t.none}
                </Meta>
              </div>
              {canEdit && <LinkButton onClick={() => setRemovingId(c._id)}>{t.remove}</LinkButton>}
            </Row>
          ))
        )}
      </Panel>
      {removingId && (
        <ConfirmDialog
          title={t.remove}
          message={t.confirmRemove}
          onCancel={() => setRemovingId('')}
          onConfirm={() => remove(removingId)}
        />
      )}
      {adding && (
        <AddContactModal
          client={client}
          onClose={() => setAdding(false)}
          onSaved={(c) => { setAdding(false); onClientChange(c); }}
        />
      )}
    </>
  );
}

function AddContactModal({ client, onClose, onSaved }: {
  client: Client;
  onClose: () => void;
  onSaved: (c: Client) => void;
}) {
  const t = useTranslations(texts);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(client.contacts.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await manageApiFetch<{ client: Client }>(`/api/manage/clients/${client._id}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ name, role, phone, officePhone, email, isPrimary }),
      });
      onSaved(res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{t.addContact}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.contactName}
              <SmallInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <Field>
              {t.contactRole}
              <SmallInput value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>
            <Field>
              {t.contactPhone}
              <SmallInput value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </Field>
            <Field>
              {t.contactOffice}
              <SmallInput value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} type="tel" />
            </Field>
            <Field>
              {t.contactEmail}
              <SmallInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </Field>
          </FieldGrid>
          <CheckLine>
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            {t.markPrimary}
          </CheckLine>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
