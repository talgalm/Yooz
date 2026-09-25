import { useEffect, useState, useCallback, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import ConfirmDialog from '../ConfirmDialog';
import { Project, formatMoney, formatDate, toDateInput } from '../manageTypes';
import { BORDER, TEXT_LIGHT, PRIMARY } from '../../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, LinkButton, Pill, ErrorNote,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect,
} from '../manageUi';

interface PaymentRow {
  _id: string;
  projectId: string;
  projectName: string;
  clientName?: string;
  label: string;
  amount: number;
  plannedDate?: string;
  invoiced: boolean;
  paid: boolean;
}

const Head = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 10, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap',
});
const Title = styled('b')({ fontSize: 15 });
const Totals = styled('div')({
  display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 16px',
  fontSize: 13, color: TEXT_LIGHT, borderBottom: `1px solid ${BORDER}`, background: '#faf9fd',
});
const TotalValue = styled('b')({ color: PRIMARY });
const Row = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  padding: '10px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const Amount = styled('b')({ minWidth: 90 });
const Meta = styled('span')({ flex: 1, minWidth: 130, color: TEXT_LIGHT, fontSize: 13 });
const Check = styled('label')({
  display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
});

export default function PaymentsPanel({ onChanged }: { onChanged: () => void }) {
  const t = useTranslations(texts);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [totals, setTotals] = useState({ total: 0, invoiced: 0, paid: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<PaymentRow | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await manageApiFetch<{ payments: PaymentRow[] } & typeof totals>('/api/manage/finance/payments');
      setRows(r.payments);
      setTotals({ total: r.total, invoiced: r.invoiced, paid: r.paid, outstanding: r.outstanding });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (row: PaymentRow, field: 'invoiced' | 'paid', value: boolean) => {
    try {
      await manageApiFetch(`/api/manage/finance/project/${row.projectId}/payments/${row._id}`, {
        method: 'PATCH', body: JSON.stringify({ [field]: value }),
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
      await manageApiFetch(`/api/manage/finance/project/${deleting.projectId}/payments/${deleting._id}`, {
        method: 'DELETE',
      });
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
      <Panel>
        <Head>
          <Title>{t.payments}</Title>
          <Button onClick={() => setAdding(true)}>{t.addPayment}</Button>
        </Head>
        <Totals>
          <span>{t.contracted}: <TotalValue>{formatMoney(totals.total)}</TotalValue></span>
          <span>{t.invoiced}: <TotalValue>{formatMoney(totals.invoiced)}</TotalValue></span>
          <span>{t.paidTotal}: <TotalValue>{formatMoney(totals.paid)}</TotalValue></span>
          <span>{t.outstanding}: <TotalValue>{formatMoney(totals.outstanding)}</TotalValue></span>
        </Totals>
        {error && <ErrorNote>{error}</ErrorNote>}
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>{t.noPayments}</EmptyState>
        ) : (
          rows.map((r) => (
            <Row key={r._id}>
              <Amount>{formatMoney(r.amount)}</Amount>
              <Meta>
                {r.label} · {r.projectName}
                {r.clientName ? ` · ${r.clientName}` : ''}
                {r.plannedDate ? ` · ${formatDate(r.plannedDate)}` : ''}
              </Meta>
              <Check>
                <input type="checkbox" checked={r.invoiced} onChange={(e) => toggle(r, 'invoiced', e.target.checked)} />
                {t.invoiced}
              </Check>
              <Check>
                <input type="checkbox" checked={r.paid} onChange={(e) => toggle(r, 'paid', e.target.checked)} />
                {t.paidTotal}
              </Check>
              {r.paid && <Pill>{t.received}</Pill>}
              <LinkButton onClick={() => setDeleting(r)}>{t.delete}</LinkButton>
            </Row>
          ))
        )}
      </Panel>

      {adding && (
        <PaymentModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); onChanged(); }} />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDeletePayment}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

function PaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useTranslations(texts);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState(toDateInput(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<{ projects: Project[] }>('/api/manage/projects')
      .then((r) => setProjects(r.projects)).catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await manageApiFetch(`/api/manage/finance/project/${projectId}/payments`, {
        method: 'POST', body: JSON.stringify({ label, amount: Number(amount), plannedDate }),
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
        <ModalTitle>{t.addPayment}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.project}
              <SmallSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                <option value="">{t.pickProject}</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.paymentLabel}
              <SmallInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.paymentLabelHint} required />
            </Field>
            <Field>
              {t.amount}
              <SmallInput type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field>
              {t.plannedDate}
              <SmallInput type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            </Field>
          </FieldGrid>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !projectId || !label.trim() || !amount}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
