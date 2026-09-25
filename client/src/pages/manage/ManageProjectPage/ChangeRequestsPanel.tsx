import { useEffect, useState, useCallback, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import ConfirmDialog from '../ConfirmDialog';
import {
  ChangeRequest, ChangeRequestStatus, CHANGE_REQUEST_STATUSES,
  formatMoney, formatDate, toDateInput,
} from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, LinkButton, Pill, ErrorNote,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
} from '../manageUi';

const Head = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 10, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap',
});
const Title = styled('b')({ fontSize: 15 });
const Row = styled('div')({
  padding: '11px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const TopLine = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' });
const Desc = styled('span')({ flex: 1, minWidth: 140, fontWeight: 600 });
const Meta = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 4 });

export default function ChangeRequestsPanel({ projectId, onChanged }: {
  projectId: string; onChanged: () => void;
}) {
  const t = useTranslations(texts);
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ChangeRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await manageApiFetch<{ changeRequests: ChangeRequest[] }>(
        `/api/manage/finance/change-requests?projectId=${projectId}`,
      );
      setItems(r.changeRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (cr: ChangeRequest, status: ChangeRequestStatus) => {
    try {
      await manageApiFetch(`/api/manage/finance/change-requests/${cr._id}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await manageApiFetch(`/api/manage/finance/change-requests/${deleting._id}`, { method: 'DELETE' });
      setDeleting(null);
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setDeleting(null);
    }
  };

  return (
    <>
      <Panel style={{ marginBottom: 18 }}>
        <Head>
          <Title>{t.changeRequests}</Title>
          <Button onClick={() => setAdding(true)}>{t.addChangeRequest}</Button>
        </Head>
        {error && <ErrorNote>{error}</ErrorNote>}
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>{t.noChangeRequests}</EmptyState>
        ) : (
          items.map((cr) => (
            <Row key={cr._id}>
              <TopLine>
                <Desc>{cr.description}</Desc>
                <SmallSelect
                  value={cr.status}
                  onChange={(e) => setStatus(cr, e.target.value as ChangeRequestStatus)}
                >
                  {CHANGE_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>{t.crStatuses[s]}</option>
                  ))}
                </SmallSelect>
                <LinkButton onClick={() => setDeleting(cr)}>{t.delete}</LinkButton>
              </TopLine>
              <Meta>
                {cr.estimatedHours}h · {formatMoney(cr.additionalPrice)} · {formatDate(cr.date)}
                {cr.requestedByName ? ` · ${cr.requestedByName}` : ''}
                {cr.appliedToBudget ? ' · ' : ''}
                {cr.appliedToBudget && <Pill>{t.appliedToBudget}</Pill>}
              </Meta>
            </Row>
          ))
        )}
      </Panel>

      {adding && (
        <CrModal
          projectId={projectId}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); onChanged(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDeleteCr}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

function CrModal({ projectId, onClose, onSaved }: {
  projectId: string; onClose: () => void; onSaved: () => void;
}) {
  const t = useTranslations(texts);
  const [description, setDescription] = useState('');
  const [requestedByName, setRequestedBy] = useState('');
  const [estimatedHours, setHours] = useState('');
  const [additionalPrice, setPrice] = useState('');
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await manageApiFetch('/api/manage/finance/change-requests', {
        method: 'POST',
        body: JSON.stringify({
          projectId, description, requestedByName, date,
          estimatedHours: Number(estimatedHours) || 0,
          additionalPrice: Number(additionalPrice) || 0,
        }),
      });
      onSaved();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{t.addChangeRequest}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <Field>
            {t.crDescription}
            <SmallTextarea value={description} onChange={(e) => setDescription(e.target.value)} required autoFocus />
          </Field>
          <FieldGrid style={{ marginTop: 14 }}>
            <Field>
              {t.estimatedHours}
              <SmallInput type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <Field>
              {t.additionalPrice}
              <SmallInput type="number" min="0" step="1" value={additionalPrice} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field>
              {t.requestedBy}
              <SmallInput value={requestedByName} onChange={(e) => setRequestedBy(e.target.value)} />
            </Field>
            <Field>
              {t.date}
              <SmallInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </FieldGrid>
          <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 10 }}>{t.approveHint}</div>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !description.trim()}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
