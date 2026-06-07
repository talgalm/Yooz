import { useCallback, useEffect, useState } from 'react';
import { adminApiFetch } from '../../utils/adminApi';
import { useTranslations } from '../../context/LanguageContext';
import { texts, getDocPreviewKind } from './AdminHelpChat.i18n';
import {
  DevPanelBackdrop,
  DevPanelCard,
  DevPanelHeader,
  DevPanelClose,
  DevPanelBody,
  DevFilterRow,
  DevFilterBtn,
  DevTaskList,
  DevTaskRow,
  DevTypeBadge,
  DevTaskMeta,
  DevTaskDescription,
  DevStatusSelect,
  DevEmptyState,
  DevPanelLoading,
  DevTaskDocLink,
  DevDocViewerBackdrop,
  DevDocViewerCard,
  DevDocViewerHeader,
  DevDocViewerActions,
  DevDocOpenLink,
  DevDocViewerBody,
  DevDocFrame,
  DevDocImage,
} from './styled';

export type DevTaskType = 'feature' | 'bug' | 'change';
export type DevTaskStatus = 'open' | 'in_progress' | 'done' | 'closed';

export interface DevTaskItem {
  _id: string;
  type: DevTaskType;
  description: string;
  status: DevTaskStatus;
  createdBy: string;
  createdByName?: string;
  route?: string;
  documentUrl?: string;
  documentName?: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | DevTaskStatus;

interface DevTasksPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function DevTasksPanel({ open, onClose }: DevTasksPanelProps) {
  const t = useTranslations(texts);
  const [tasks, setTasks] = useState<DevTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name?: string } | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApiFetch<DevTaskItem[]>('/api/admin/dev-tasks');
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadTasks();
  }, [open, loadTasks]);

  const updateStatus = async (id: string, status: DevTaskStatus) => {
    setUpdatingId(id);
    try {
      const updated = await adminApiFetch<DevTaskItem>(`/api/admin/dev-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTasks((prev) => prev.map((task) => (task._id === id ? updated : task)));
    } finally {
      setUpdatingId(null);
    }
  };

  const typeLabel = (type: DevTaskType) => {
    if (type === 'feature') return t.devTypeFeature;
    if (type === 'bug') return t.devTypeBug;
    return t.devTypeChange;
  };

  const statusLabel = (status: DevTaskStatus) => {
    if (status === 'open') return t.devStatusOpen;
    if (status === 'in_progress') return t.devStatusInProgress;
    if (status === 'done') return t.devStatusDone;
    return t.devStatusClosed;
  };

  const filtered =
    statusFilter === 'all' ? tasks : tasks.filter((task) => task.status === statusFilter);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t.devFilterAll },
    { key: 'open', label: t.devStatusOpen },
    { key: 'in_progress', label: t.devStatusInProgress },
    { key: 'done', label: t.devStatusDone },
    { key: 'closed', label: t.devStatusClosed },
  ];

  const previewKind = viewingDoc
    ? getDocPreviewKind(viewingDoc.url, viewingDoc.name)
    : null;

  if (!open) return null;

  return (
    <>
      <DevPanelBackdrop onClick={onClose}>
        <DevPanelCard onClick={(e) => e.stopPropagation()}>
          <DevPanelHeader>
            <span>{t.devPanelTitle}</span>
            <DevPanelClose onClick={onClose} aria-label="Close">
              &times;
            </DevPanelClose>
          </DevPanelHeader>

          <DevFilterRow>
            {filters.map((f) => (
              <DevFilterBtn
                key={f.key}
                type="button"
                $active={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </DevFilterBtn>
            ))}
          </DevFilterRow>

          <DevPanelBody>
            {loading ? (
              <DevPanelLoading>{t.devPanelLoading}</DevPanelLoading>
            ) : filtered.length === 0 ? (
              <DevEmptyState>{t.devPanelEmpty}</DevEmptyState>
            ) : (
              <DevTaskList>
                {filtered.map((task) => (
                  <DevTaskRow key={task._id}>
                    <DevTypeBadge $type={task.type}>{typeLabel(task.type)}</DevTypeBadge>
                    {task.description && <DevTaskDescription>{task.description}</DevTaskDescription>}
                    <DevTaskMeta>
                      <span>{task.createdByName || task.createdBy}</span>
                      <span>{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
                      {task.route && <span>{task.route}</span>}
                    </DevTaskMeta>
                    {task.documentUrl && (
                      <DevTaskDocLink
                        type="button"
                        onClick={() =>
                          setViewingDoc({
                            url: task.documentUrl!,
                            name: task.documentName,
                          })
                        }
                      >
                        📎 {task.documentName || t.devViewDoc}
                      </DevTaskDocLink>
                    )}
                    <DevStatusSelect
                      value={task.status}
                      disabled={updatingId === task._id}
                      onChange={(e) => void updateStatus(task._id, e.target.value as DevTaskStatus)}
                      aria-label={statusLabel(task.status)}
                    >
                      <option value="open">{t.devStatusOpen}</option>
                      <option value="in_progress">{t.devStatusInProgress}</option>
                      <option value="done">{t.devStatusDone}</option>
                      <option value="closed">{t.devStatusClosed}</option>
                    </DevStatusSelect>
                  </DevTaskRow>
                ))}
              </DevTaskList>
            )}
          </DevPanelBody>
        </DevPanelCard>
      </DevPanelBackdrop>

      {viewingDoc && (
        <DevDocViewerBackdrop onClick={() => setViewingDoc(null)}>
          <DevDocViewerCard onClick={(e) => e.stopPropagation()}>
            <DevDocViewerHeader>
              <span>{viewingDoc.name || t.devDocPreviewTitle}</span>
              <DevDocViewerActions>
                <DevDocOpenLink href={viewingDoc.url} target="_blank" rel="noopener noreferrer">
                  {t.devOpenDoc}
                </DevDocOpenLink>
                <DevPanelClose onClick={() => setViewingDoc(null)} aria-label="Close">
                  &times;
                </DevPanelClose>
              </DevDocViewerActions>
            </DevDocViewerHeader>
            <DevDocViewerBody>
              {previewKind === 'pdf' && (
                <DevDocFrame src={viewingDoc.url} title={viewingDoc.name || t.devDocPreviewTitle} />
              )}
              {previewKind === 'image' && (
                <DevDocImage src={viewingDoc.url} alt={viewingDoc.name || t.devDocPreviewTitle} />
              )}
              {previewKind === 'other' && (
                <DevDocOpenLink href={viewingDoc.url} target="_blank" rel="noopener noreferrer">
                  {t.devOpenDoc} — {viewingDoc.name || viewingDoc.url}
                </DevDocOpenLink>
              )}
            </DevDocViewerBody>
          </DevDocViewerCard>
        </DevDocViewerBackdrop>
      )}
    </>
  );
}
