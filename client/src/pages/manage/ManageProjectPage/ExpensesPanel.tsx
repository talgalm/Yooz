import { useEffect, useState, useCallback, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import ConfirmDialog from '../ConfirmDialog';
import {
  Expense, ExpenseCategory, EXPENSE_CATEGORIES, Project, refName,
  formatMoney, formatDate, toDateInput,
} from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, LinkButton, Pill, ErrorNote,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect,
} from '../manageUi';

const Head = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 10, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap',
});
const Title = styled('b')({ fontSize: 15 });
const Row = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  padding: '10px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const Amount = styled('b')({ minWidth: 90 });
const Meta = styled('span')({ flex: 1, minWidth: 120, color: TEXT_LIGHT, fontSize: 13 });

export default function ExpensesPanel({ projectId, onChanged }: { projectId?: string; onChanged: () => void }) {
  const t = useTranslations(texts);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    try {
      const q = projectId ? `?projectId=${projectId}` : '';
      const r = await manageApiFetch<{ expenses: Expense[]; total: number }>(
        `/api/manage/finance/expenses${q}`,
      );
      setExpenses(r.expenses);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await manageApiFetch(`/api/manage/finance/expenses/${deleting._id}`, { method: 'DELETE' });
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
          <Title>{t.expenses} · {formatMoney(total)}</Title>
          <Button onClick={() => setAdding(true)}>{t.addExpense}</Button>
        </Head>
        {error && <ErrorNote>{error}</ErrorNote>}
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : expenses.length === 0 ? (
          <EmptyState>{t.noExpenses}</EmptyState>
        ) : (
          expenses.map((e) => (
            <Row key={e._id}>
              <Amount>{formatMoney(e.amount)}</Amount>
              <Meta>
                {!projectId && refName(e.projectId) ? `${refName(e.projectId)} · ` : ''}
                {t.categories[e.category]}
                {e.vendor ? ` · ${e.vendor}` : ''}
                {e.description ? ` — ${e.description}` : ''}
                {` · ${formatDate(e.date)}`}
              </Meta>
              {e.billable && <Pill>{t.billable}</Pill>}
              <LinkButton onClick={() => setDeleting(e)}>{t.delete}</LinkButton>
            </Row>
          ))
        )}
      </Panel>

      {adding && (
        <ExpenseModal
          projectId={projectId}
          key={projectId ?? 'all'}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); onChanged(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDeleteExpense}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

function ExpenseModal({ projectId, onClose, onSaved }: {
  projectId?: string; onClose: () => void; onSaved: () => void;
}) {
  const t = useTranslations(texts);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chosenProject, setChosenProject] = useState(projectId ?? '');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('freelancer');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [billable, setBillable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectId) return;
    manageApiFetch<{ projects: Project[] }>('/api/manage/projects')
      .then((r) => setProjects(r.projects)).catch(() => {});
  }, [projectId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await manageApiFetch('/api/manage/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          projectId: chosenProject, amount: Number(amount), category, vendor, description, date, billable,
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
        <ModalTitle>{t.addExpense}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            {!projectId && (
              <Field>
                {t.project}
                <SmallSelect value={chosenProject} onChange={(e) => setChosenProject(e.target.value)} required>
                  <option value="">{t.pickProject}</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </SmallSelect>
              </Field>
            )}
            <Field>
              {t.amount}
              <SmallInput
                type="number" min="0" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus
              />
            </Field>
            <Field>
              {t.category}
              <SmallSelect value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.vendor}
              <SmallInput value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </Field>
            <Field>
              {t.date}
              <SmallInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field>
              {t.description}
              <SmallInput value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </FieldGrid>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
            {t.billable}
          </label>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !amount || !chosenProject}>{saving ? t.saving : t.save}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
