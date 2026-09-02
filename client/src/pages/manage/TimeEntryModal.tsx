import { useState, useEffect, FormEvent } from 'react';
import { manageApiFetch } from '../../utils/manageApi';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './time.i18n';
import {
  TimeEntry, TimeCategory, TIME_CATEGORIES, CATEGORIES_REQUIRING_PROJECT,
  Project, refId, toDateInput,
} from './manageTypes';
import { parseDuration, DurationUnit, formatHours } from './duration';
import { TEXT_LIGHT } from '../../components/styled';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  Button, GhostButton, ErrorNote,
} from './manageUi';

interface Props {
  entry?: TimeEntry;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Log or edit one time entry. Duration accepts hours, minutes, h:mm or a suffix. */
export default function TimeEntryModal({ entry, defaultDate, onClose, onSaved }: Props) {
  const t = useTranslations(texts);

  const [date, setDate] = useState(toDateInput(entry?.date ?? defaultDate));
  const [amount, setAmount] = useState(entry ? formatHours(entry.minutes) : '');
  const [unit, setUnit] = useState<DurationUnit>('hours');
  const [category, setCategory] = useState<TimeCategory>(entry?.category ?? 'client_project');
  const [projectId, setProjectId] = useState(refId(entry?.projectId) ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<{ projects: Project[] }>('/api/manage/projects')
      .then((r) => setProjects(r.projects))
      .catch(() => setProjects([]));
  }, []);

  const minutes = parseDuration(amount, unit);
  const needsProject = CATEGORIES_REQUIRING_PROJECT.includes(category);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (minutes === null) { setError(t.invalidDuration); return; }
    setError('');
    setSaving(true);
    try {
      await manageApiFetch(entry ? `/api/manage/time/${entry._id}` : '/api/manage/time', {
        method: entry ? 'PATCH' : 'POST',
        body: JSON.stringify({ date, minutes, category, projectId: projectId || '', note }),
      });
      onSaved();
    } catch (err) {
      // The server answers with a stable code; turn it into a sentence.
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code ?? 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{entry ? t.editEntry : t.logHours}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.date}
              <SmallInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field>
              {t.duration}
              <div style={{ display: 'flex', gap: 6 }}>
                <SmallInput
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={unit === 'hours' ? '1.5' : '90'}
                  required
                  autoFocus
                  style={{ flex: 1, minWidth: 0 }}
                />
                <SmallSelect value={unit} onChange={(e) => setUnit(e.target.value as DurationUnit)}>
                  <option value="hours">{t.unitHours}</option>
                  <option value="minutes">{t.unitMinutes}</option>
                </SmallSelect>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 400, color: TEXT_LIGHT }}>
                {minutes !== null ? `= ${formatHours(minutes)} ${t.unitHours} (${minutes} ${t.unitMinutes})` : t.durationHint}
              </span>
            </Field>
            <Field>
              {t.category}
              <SmallSelect value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
                {TIME_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.project}
              <SmallSelect
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required={needsProject}
              >
                <option value="">{needsProject ? t.pickProject : t.noProject}</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </SmallSelect>
            </Field>
          </FieldGrid>
          <Field style={{ marginTop: 14 }}>
            {t.note}
            <SmallTextarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 56 }} />
          </Field>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || minutes === null || (needsProject && !projectId)}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
