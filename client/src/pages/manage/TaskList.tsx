import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './tasks.i18n';
import {
  Task, PRIORITY_COLORS, overdueDays, isDueToday, refName, refColor, formatDate,
} from './manageTypes';
import { Table, TEXT_LIGHT } from '../../components/styled';
import { Panel, TableScroll, EmptyState, Pill, MOBILE } from './manageUi';

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

/** Priority reads as a colour bar, not another word to parse in a dense table. */
const PriorityBar = styled('span')<{ tone: string }>(({ tone }) => ({
  display: 'inline-block',
  width: 4,
  height: 15,
  borderRadius: 2,
  background: tone,
  marginInlineEnd: 8,
  verticalAlign: 'middle',
}));

/** Whose task it is, at a glance — the same colour follows the person everywhere. */
const OwnerDot = styled('span')<{ tone: string }>(({ tone }) => ({
  display: 'inline-block',
  width: 9, height: 9, borderRadius: '50%',
  background: tone,
  marginInlineEnd: 8,
  verticalAlign: 'middle',
}));

const TitleCell = styled('td')<{ done?: boolean }>(({ done }) => ({
  fontWeight: 600,
  opacity: done ? 0.5 : 1,
  textDecoration: done ? 'line-through' : 'none',
}));

const Sub = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, fontWeight: 400, marginTop: 2 });

interface Props {
  tasks: Task[];
  loading?: boolean;
  showProject?: boolean;
  showAssignee?: boolean;
  onOpen: (task: Task) => void;
}

export default function TaskList({ tasks, loading, showProject = true, showAssignee = true, onOpen }: Props) {
  const t = useTranslations(texts);

  if (loading) return <Panel><EmptyState>{t.loading}</EmptyState></Panel>;
  if (tasks.length === 0) return <Panel><EmptyState>{t.empty}</EmptyState></Panel>;

  return (
    <Panel>
      <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>{t.taskTitle}</th>
              <th>{t.status}</th>
              {showAssignee && <DesktopHead>{t.assignee}</DesktopHead>}
              {showProject && <DesktopHead>{t.project}</DesktopHead>}
              <th>{t.dueDate}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const late = overdueDays(task);
              return (
                <tr key={task._id} onClick={() => onOpen(task)}>
                  <TitleCell done={task.status === 'done'}>
                    <OwnerDot
                      tone={refColor(task.assigneeUserId) ?? '#8d86a3'}
                      title={refName(task.assigneeUserId) ?? ''}
                    />
                    <PriorityBar tone={PRIORITY_COLORS[task.priority]} title={t.priorities[task.priority]} />
                    {task.title}
                    {task.needsOwner && (
                      <Sub>
                        <Pill tone="warn">{t.needsOwner}</Pill>
                        {task.needsOwnerReason ? ` ${task.needsOwnerReason}` : ''}
                      </Sub>
                    )}
                  </TitleCell>
                  <td><Pill tone={task.status === 'done' ? 'muted' : 'default'}>{t.statuses[task.status]}</Pill></td>
                  {showAssignee && <DesktopCell>{refName(task.assigneeUserId) ?? '—'}</DesktopCell>}
                  {showProject && (
                    <DesktopCell>
                      {refName(task.projectId) ?? refName(task.clientId) ?? '—'}
                    </DesktopCell>
                  )}
                  <td>
                    {task.dueDate ? formatDate(task.dueDate) : '—'}
                    {late !== null && <> <Pill tone="warn">{t.overdue(late)}</Pill></>}
                    {isDueToday(task) && <> <Pill>{t.dueToday}</Pill></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableScroll>
    </Panel>
  );
}
