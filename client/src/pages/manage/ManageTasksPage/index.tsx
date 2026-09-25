import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../tasks.i18n';
import TaskList from '../TaskList';
import TaskModal from '../TaskModal';
import { Task, TeamMember, TASK_STATUSES, TASK_PRIORITIES } from '../manageTypes';
import {
  PageHeader, SectionTitle, Toolbar, SmallSelect, Button, ErrorNote,
} from '../manageUi';

export default function ManageTasksPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const canSeeTeam = user?.role === 'owner' || user?.role === 'pm';
  const [params, setParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [scope, setScope] = useState('open');
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      else if (scope === 'open') q.set('scope', 'open');
      if (scope === 'standalone') q.set('scope', 'standalone');
      if (priority) q.set('priority', priority);
      if (assignee) q.set('assigneeUserId', assignee);
      const r = await manageApiFetch<{ tasks: Task[] }>(`/api/manage/tasks?${q}`);
      setTasks(r.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [status, priority, assignee, scope]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canSeeTeam) {
      manageApiFetch<{ users: TeamMember[] }>('/api/manage/users')
        .then((r) => setPeople(r.users)).catch(() => {});
    }
  }, [canSeeTeam]);

  useEffect(() => {
    const id = params.get('task');
    if (!id || tasks.length === 0) return;
    const found = tasks.find((x) => x._id === id);
    if (found) { setEditing(found); setParams({}, { replace: true }); }
  }, [params, tasks, setParams]);

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
        <Button onClick={() => setCreating(true)}>{t.newTask}</Button>
      </PageHeader>

      <Toolbar>
        <SmallSelect value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="open">{t.openOnly}</option>
          <option value="">{t.allStatuses}</option>
          <option value="standalone">{t.standaloneOnly}</option>
        </SmallSelect>
        <SmallSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.allStatuses}</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
        </SmallSelect>
        <SmallSelect value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">{t.allPriorities}</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{t.priorities[p]}</option>)}
        </SmallSelect>
        {canSeeTeam && (
          <SmallSelect value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t.allAssignees}</option>
            {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </SmallSelect>
        )}
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <TaskList tasks={tasks} loading={loading} onOpen={setEditing} />

      {(editing || creating) && (
        <TaskModal
          task={editing ?? undefined}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </>
  );
}
