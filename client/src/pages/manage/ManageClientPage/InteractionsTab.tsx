import { useEffect, useState, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageClientPage.i18n';
import {
  Client, Interaction, INTERACTION_TYPES, InteractionType, formatDate, toDateInput,
} from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, Pill, ErrorNote,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
} from '../manageUi';

const Entry = styled('div')({
  padding: '14px 18px',
  borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});

const EntryHead = styled('div')({
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5,
});

const Meta = styled('span')({ fontSize: 13, color: TEXT_LIGHT });
const Summary = styled('div')({ fontSize: 14, whiteSpace: 'pre-wrap' });
const NextAction = styled('div')({ fontSize: 13, color: TEXT_LIGHT, marginTop: 6 });

interface Props {
  client: Client;
  onClientChange: (c: Client) => void;
}

/** Every role can log an interaction — see the route comment in manageClients.ts. */
export default function InteractionsTab({ client, onClientChange }: Props) {
  const t = useTranslations(texts);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    manageApiFetch<{ interactions: Interaction[] }>(`/api/manage/clients/${client._id}/interactions`)
      .then((res) => setInteractions(res.interactions))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [client._id]);

  return (
    <>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div style={{ marginBottom: 14 }}>
        <Button onClick={() => setLogging(true)}>{t.logInteraction}</Button>
      </div>
      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : interactions.length === 0 ? (
          <EmptyState>{t.noInteractions}</EmptyState>
        ) : (
          interactions.map((i) => (
            <Entry key={i._id}>
              <EntryHead>
                <Pill>{t.types[i.type]}</Pill>
                <Meta>{formatDate(i.date)}</Meta>
                {i.userId?.name && <Meta>· {t.by} {i.userId.name}</Meta>}
              </EntryHead>
              <Summary>{i.summary}</Summary>
              {i.nextActionText && (
                <NextAction>
                  {t.nextAction}: {i.nextActionText}
                  {i.nextActionDate ? ` · ${formatDate(i.nextActionDate)}` : ''}
                </NextAction>
              )}
            </Entry>
          ))
        )}
      </Panel>
      {logging && (
        <LogModal
          client={client}
          onClose={() => setLogging(false)}
          onSaved={(interaction, updated) => {
            setLogging(false);
            setInteractions((prev) => [interaction, ...prev]);
            // The server recomputed lastContactDate — reflect it without a refetch.
            onClientChange(updated);
          }}
        />
      )}
    </>
  );
}

function LogModal({ client, onClose, onSaved }: {
  client: Client;
  onClose: () => void;
  onSaved: (i: Interaction, c: Client) => void;
}) {
  const t = useTranslations(texts);
  const [type, setType] = useState<InteractionType>('call');
  const [date, setDate] = useState(toDateInput());
  const [contactId, setContactId] = useState('');
  const [summary, setSummary] = useState('');
  const [nextActionText, setNextActionText] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await manageApiFetch<{ interaction: Interaction; client: Client }>(
        `/api/manage/clients/${client._id}/interactions`,
        {
          method: 'POST',
          body: JSON.stringify({ type, date, contactId: contactId || undefined, summary, nextActionText, nextActionDate }),
        },
      );
      onSaved(res.interaction, res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{t.logInteraction}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.interactionType}
              <SmallSelect value={type} onChange={(e) => setType(e.target.value as InteractionType)}>
                {INTERACTION_TYPES.map((x) => <option key={x} value={x}>{t.types[x]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.interactionDate}
              <SmallInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            {client.contacts.length > 0 && (
              <Field>
                {t.interactionContact}
                <SmallSelect value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  <option value="">{t.none}</option>
                  {client.contacts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </SmallSelect>
              </Field>
            )}
          </FieldGrid>
          <Field style={{ marginTop: 14 }}>
            {t.interactionSummary}
            <SmallTextarea value={summary} onChange={(e) => setSummary(e.target.value)} required autoFocus />
          </Field>
          <FieldGrid style={{ marginTop: 14 }}>
            <Field>
              {t.nextActionText}
              <SmallInput value={nextActionText} onChange={(e) => setNextActionText(e.target.value)} />
            </Field>
            <Field>
              {t.nextActionDate}
              <SmallInput type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
            </Field>
          </FieldGrid>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !summary.trim()}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
