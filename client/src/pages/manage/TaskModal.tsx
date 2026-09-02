import { useState, useEffect, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../utils/manageApi';
import { useManageAuth } from '../../context/ManageAuthContext';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './tasks.i18n';
import ConfirmDialog from './ConfirmDialog';
import {
  Task, TaskStatus, TaskPriority, TASK_STATUSES, TASK_PRIORITIES,
  Project, Client, TeamMember, refId, refName, toDateInput, formatDate,
} from './manageTypes';
import { BORDER, TEXT_LIGHT, PRIMARY } from '../../components/styled';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  FieldGrid, Field, SmallInput, SmallSelect, SmallTextarea,
  Button, GhostButton, DangerButton, ErrorNote,
} from './manageUi';

const Section = styled('div')({ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` });
const SectionTitle = styled('div')({ fontSize: 13, fontWeight: 700, color: TEXT_LIGHT, marginBottom: 10 });

const VisibilityBox = styled('div')({
  padding: 12, borderRadius: 10, background: '#faf9fd', border: `1px solid ${BORDER}`, marginTop: 14,
});

const CheckLine = styled('label')({
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600,
});

const Comment = styled('div')({ padding: '9px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 14 });
const CommentHead = styled('div')({
  display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: TEXT_LIGHT, marginBottom: 3,
});
const CommentRow = styled('div')({ display: 'flex', gap: 8, marginTop: 10 });

interface Props {
  task?: Task;
  defaultProjectId?: string;
  defaultDueDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, defaultProjectId, defaultDueDate, onClose, onSaved }: Props) {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const canSeeTeam = user?.role === 'owner' || user?.role === 'pm';

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeUserId, setAssignee] = useState(refId(task?.assigneeUserId) ?? user?._id ?? '');
  const [projectId, setProjectId] = useState(refId(task?.projectId) ?? defaultProjectId ?? '');
  const [clientId, setClientId] = useState(refId(task?.clientId) ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'not_started');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [dueDate, setDueDate] = useState(task?.dueDate ? toDateInput(task.dueDate) : defaultDueDate ?? '');
  const [plannedHours, setPlannedHours] = useState(String(task?.plannedHours ?? ''));

  const [visibleToAll, setVisibleToAll] = useState(task?.visibleToAll ?? false);

  const [full, setFull] = useState<Task | undefined>(task);
  const [commentText, setCommentText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [people, setPeople] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    manageApiFetch<{ projects: Project[] }>('/api/manage/projects').then((r) => setProjects(r.projects)).catch(() => {});
    manageApiFetch<{ clients: Client[] }>('/api/manage/clients').then((r) => setClients(r.clients)).catch(() => {});
    if (canSeeTeam) {
      manageApiFetch<{ users: TeamMember[] }>('/api/manage/users').then((r) => setPeople(r.users)).catch(() => {});
    }
    if (task) {
      manageApiFetch<{ task: Task }>(`/api/manage/tasks/${task._id}`).then((r) => setFull(r.task)).catch(() => {});
    }
  }, [task?._id, canSeeTeam]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await manageApiFetch(task ? `/api/manage/tasks/${task._id}` : '/api/manage/tasks', {
        method: task ? 'PATCH' : 'POST',
        body: JSON.stringify({
          title, description, assigneeUserId, projectId, clientId, status, priority, dueDate,
          plannedHours: Number(plannedHours) || 0,
          visibleToAll,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!task || !commentText.trim()) return;
    try {
      const r = await manageApiFetch<{ task: Task }>(`/api/manage/tasks/${task._id}/comments`, {
        method: 'POST', body: JSON.stringify({ text: commentText }),
      });
      setFull(r.task);
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async () => {
    if (!task) return;
    try {
      await manageApiFetch(`/api/manage/tasks/${task._id}`, { method: 'DELETE' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <ModalBackdrop onClick={onClose}>
        <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
          <ModalTitle>{task ? t.editTask : t.newTask}</ModalTitle>
          {error && <ErrorNote>{error}</ErrorNote>}
          <form onSubmit={submit}>
            <Field>
              {t.taskTitle}
              <SmallInput value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
            </Field>

            <FieldGrid style={{ marginTop: 14 }}>
              <Field>
                {t.assignee}
                {canSeeTeam ? (
                  <SmallSelect value={assigneeUserId} onChange={(e) => setAssignee(e.target.value)}>
                    {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </SmallSelect>
                ) : (
                  <SmallInput value={user?.name ?? ''} disabled />
                )}
              </Field>
              <Field>
                {t.status}
                <SmallSelect value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
                </SmallSelect>
              </Field>
              <Field>
                {t.priority}
                <SmallSelect value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{t.priorities[p]}</option>)}
                </SmallSelect>
              </Field>
              <Field>
                {t.dueDate}
                <SmallInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field>
                {t.project}
                <SmallSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">{t.noProject}</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </SmallSelect>
              </Field>
              {/* A todo can hang off a client instead of a project. */}
              {!projectId && (
                <Field>
                  {t.client}
                  <SmallSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">{t.noClient}</option>
                    {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </SmallSelect>
                </Field>
              )}
              <Field>
                {t.plannedHours}
                <SmallInput
                  type="number" min="0" step="0.5"
                  value={plannedHours}
                  onChange={(e) => setPlannedHours(e.target.value)}
                />
              </Field>
            </FieldGrid>

            <Field style={{ marginTop: 14 }}>
              {t.description}
              <SmallTextarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            {/* Only management publishes a task; a member's task is their own. */}
            {canSeeTeam && (
              <VisibilityBox>
                <CheckLine>
                  <input
                    type="checkbox"
                    checked={visibleToAll}
                    onChange={(e) => setVisibleToAll(e.target.checked)}
                  />
                  {t.visibleToAll}
                </CheckLine>
                <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 6 }}>
                  {visibleToAll ? t.visibleToAllOn : t.visibleToAllOff}
                </div>
              </VisibilityBox>
            )}

            <ModalActions>
              {task && <DangerButton type="button" onClick={() => setConfirmingDelete(true)}>{t.delete}</DangerButton>}
              <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
              <Button type="submit" disabled={saving || !title.trim()}>{saving ? t.saving : t.save}</Button>
            </ModalActions>
          </form>

          {task && (
            <Section>
              <SectionTitle>{t.comments}</SectionTitle>
              {(full?.comments ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: TEXT_LIGHT }}>{t.noComments}</div>
              )}
              {(full?.comments ?? []).map((c) => (
                <Comment key={c._id}>
                  <CommentHead>
                    <b style={{ color: PRIMARY }}>{refName(c.userId) ?? ''}</b>
                    <span>{formatDate(c.createdAt)}</span>
                  </CommentHead>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                </Comment>
              ))}
              <CommentRow>
                <SmallInput
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(); } }}
                />
                <Button type="button" onClick={addComment} disabled={!commentText.trim()}>{t.send}</Button>
              </CommentRow>
            </Section>
          )}
        </ModalCard>
      </ModalBackdrop>

      {confirmingDelete && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
