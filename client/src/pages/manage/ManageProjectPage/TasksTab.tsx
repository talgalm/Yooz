import { useEffect, useState, useCallback } from 'react';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../tasks.i18n';
import TaskList from '../TaskList';
import TaskModal from '../TaskModal';
import { Task } from '../manageTypes';
import { Button, ErrorNote, Toolbar } from '../manageUi';

export default function TasksTab({ projectId }: { projectId: string }) {
  const t = useTranslations(texts);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await manageApiFetch<{ tasks: Task[] }>(`/api/manage/tasks?projectId=${projectId}`);
      setTasks(r.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Toolbar>
        <Button onClick={() => setCreating(true)}>{t.newTask}</Button>
      </Toolbar>
      {error && <ErrorNote>{error}</ErrorNote>}
      <TaskList tasks={tasks} loading={loading} showProject={false} onOpen={setEditing} />
      {(editing || creating) && (
        <TaskModal
          task={editing ?? undefined}
          defaultProjectId={projectId}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </>
  );
}
