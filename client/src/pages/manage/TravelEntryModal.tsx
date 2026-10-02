import { useState, FormEvent } from 'react';
import { manageApiFetch } from '../../utils/manageApi';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './time.i18n';
import { TravelEntry, toDateInput } from './manageTypes';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, Button, GhostButton, ErrorNote,
} from './manageUi';

interface Props {
  entry?: TravelEntry;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TravelEntryModal({ entry, defaultDate, onClose, onSaved }: Props) {
  const t = useTranslations(texts);
  const [date, setDate] = useState(toDateInput(entry?.date ?? defaultDate));
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await manageApiFetch(entry ? `/api/manage/time/travel/${entry._id}` : '/api/manage/time/travel', {
        method: entry ? 'PATCH' : 'POST',
        body: JSON.stringify({ date, amount: Number(amount), note }),
      });
      onSaved();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code ?? 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{entry ? t.editTravel : t.addTravel}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.date}
              <SmallInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field>
              {t.amount}
              <SmallInput
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </Field>
          </FieldGrid>
          <Field style={{ marginTop: 14 }}>
            {t.note}
            <SmallInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !(Number(amount) > 0)}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
