import { useState, useEffect, FormEvent } from 'react';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageProjectsPage.i18n';
import {
  Project, ProjectType, PROJECT_TYPES, Client, Contact, toDateInput,
} from '../manageTypes';
import { TEXT_LIGHT } from '../../../components/styled';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  Button, GhostButton, ErrorNote,
} from '../manageUi';

interface Props {
  project?: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

export default function ProjectFormModal({ project, onClose, onSaved }: Props) {
  const t = useTranslations(texts);
  const { isOwner } = useManageAuth();

  const [name, setName] = useState(project?.name ?? '');
  const [type, setType] = useState<ProjectType>(project?.type ?? 'client');
  const [clientId, setClientId] = useState(project?.clientId ?? '');
  const [primaryContactId, setPrimaryContactId] = useState(project?.primaryContactId ?? '');
  const [plannedHours, setPlannedHours] = useState(String(project?.plannedHours ?? ''));
  const [startDate, setStartDate] = useState(project?.startDate ? toDateInput(project.startDate) : '');
  const [targetDate, setTargetDate] = useState(project?.targetDate ? toDateInput(project.targetDate) : '');
  const [recurring, setRecurring] = useState(project?.recurring?.enabled ?? false);
  const [description, setDescription] = useState(project?.description ?? '');

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<{ clients: Client[] }>('/api/manage/clients')
      .then((r) => setClients(r.clients))
      .catch(() => { /* the picker stays empty; the form still works for internal projects */ });
  }, []);

  // Contacts belong to the chosen client, so the picker refills whenever it changes.
  useEffect(() => {
    if (!clientId) { setContacts([]); return; }
    const known = clients.find((c) => c._id === clientId);
    if (known) { setContacts(known.contacts ?? []); return; }
    manageApiFetch<{ client: Client }>(`/api/manage/clients/${clientId}`)
      .then((r) => setContacts(r.client.contacts ?? []))
      .catch(() => setContacts([]));
  }, [clientId, clients]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name, type, description, startDate, targetDate,
        clientId: type === 'client' ? clientId : '',
        primaryContactId: type === 'client' ? primaryContactId : '',
        plannedHours: Number(plannedHours) || 0,
      };
      // Only the owner may write money-adjacent fields; the server enforces it too.
      if (isOwner) payload.recurring = { ...(project?.recurring ?? {}), enabled: recurring };

      const res = await manageApiFetch<{ project: Project }>(
        project ? `/api/manage/projects/${project._id}` : '/api/manage/projects',
        { method: project ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      onSaved(res.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{project ? t.editTitle : t.createTitle}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.fieldName}
              <SmallInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <Field>
              {t.fieldType}
              <SmallSelect value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
                {PROJECT_TYPES.map((x) => <option key={x} value={x}>{t.types[x]}</option>)}
              </SmallSelect>
            </Field>
            {type === 'client' && (
              <>
                <Field>
                  {t.fieldClient}
                  <SmallSelect value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                    <option value="">{t.pickClient}</option>
                    {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </SmallSelect>
                </Field>
                <Field>
                  {t.fieldContact}
                  <SmallSelect
                    value={primaryContactId}
                    onChange={(e) => setPrimaryContactId(e.target.value)}
                    disabled={contacts.length === 0}
                  >
                    <option value="">{t.noContact}</option>
                    {contacts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </SmallSelect>
                </Field>
              </>
            )}
            <Field>
              {t.fieldPlannedHours}
              <SmallInput
                type="number" min="0" step="1"
                value={plannedHours}
                onChange={(e) => setPlannedHours(e.target.value)}
              />
            </Field>
            <Field>
              {t.fieldStart}
              <SmallInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field>
              {t.fieldTarget}
              <SmallInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </Field>
          </FieldGrid>

          {!project && (
            <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 8 }}>{t.hoursHint}</div>
          )}

          {isOwner && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              {t.fieldRecurring}
            </label>
          )}

          <Field style={{ marginTop: 14 }}>
            {t.fieldDescription}
            <SmallTextarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim() || (type === 'client' && !clientId)}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
