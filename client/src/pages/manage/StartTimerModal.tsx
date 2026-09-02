import { useState, useEffect, FormEvent } from 'react';
import { manageApiFetch } from '../../utils/manageApi';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './time.i18n';
import { useManageTimer } from './TimerContext';
import {
  Project, TimeCategory, TIME_CATEGORIES, CATEGORIES_REQUIRING_PROJECT,
} from './manageTypes';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallSelect, SmallInput, Button, GhostButton, ErrorNote,
} from './manageUi';

/** Picks what the timer is for. Starting one always stops and saves any other. */
export default function StartTimerModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations(texts);
  const { start } = useManageTimer();
  const [category, setCategory] = useState<TimeCategory>('client_project');
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<{ projects: Project[] }>('/api/manage/projects')
      .then((r) => setProjects(r.projects))
      .catch(() => setProjects([]));
  }, []);

  const needsProject = CATEGORIES_REQUIRING_PROJECT.includes(category);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await start({ category, projectId: projectId || undefined, note });
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code ?? 'Failed');
      setBusy(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{t.startTimer}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.category}
              <SmallSelect value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
                {TIME_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
              </SmallSelect>
            </Field>
            <Field>
              {t.project}
              <SmallSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} required={needsProject}>
                <option value="">{needsProject ? t.pickProject : t.noProject}</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </SmallSelect>
            </Field>
          </FieldGrid>
          <Field style={{ marginTop: 14 }}>
            {t.note}
            <SmallInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={busy || (needsProject && !projectId)}>{t.start}</Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
