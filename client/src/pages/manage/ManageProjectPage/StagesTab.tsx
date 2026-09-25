import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageProjectPage.i18n';
import { Project, Stage, StageStatus, STAGE_STATUSES, formatDate } from '../manageTypes';
import { Table, TEXT_LIGHT } from '../../../components/styled';
import { Panel, TableScroll, SmallInput, SmallSelect, ErrorNote, MOBILE } from '../manageUi';

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

const TotalRow = styled('tr')({
  '& td': { fontWeight: 700, background: '#faf9fd' },
});

const SkippedName = styled('span')<{ skipped?: boolean }>(({ skipped }) => ({
  textDecoration: skipped ? 'line-through' : 'none',
  color: skipped ? TEXT_LIGHT : 'inherit',
}));

interface Props {
  project: Project;
  canEdit: boolean;
  onProjectChange: (p: Project) => void;
}

export default function StagesTab({ project, canEdit, onProjectChange }: Props) {
  const t = useTranslations(texts);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const patchStage = async (stage: Stage, body: Record<string, unknown>) => {
    setError('');
    setSavingKey(stage.key);
    try {
      const res = await manageApiFetch<{ project: Project }>(
        `/api/manage/projects/${project._id}/stages/${stage.key}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      onProjectChange(res.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingKey('');
    }
  };

  const total = Math.round(project.stages.reduce((a, s) => a + s.plannedHours, 0) * 10) / 10;

  return (
    <>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Panel>
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <th>{t.stage}</th>
                <th>{t.stagePlanned}</th>
                <th>{t.stageStatus}</th>
                <DesktopHead>{t.stageStarted}</DesktopHead>
                <DesktopHead>{t.stageDone}</DesktopHead>
              </tr>
            </thead>
            <tbody>
              {project.stages.map((s) => (
                <tr key={s.key} style={{ cursor: 'default' }}>
                  <td>
                    <SkippedName skipped={s.status === 'skipped'}>{s.name}</SkippedName>
                  </td>
                  <td>
                    {canEdit ? (
                      <SmallInput
                        type="number" min="0" step="0.5"
                        defaultValue={s.plannedHours}
                        disabled={savingKey === s.key}
                        style={{ width: 90 }}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v !== s.plannedHours) patchStage(s, { plannedHours: v });
                        }}
                      />
                    ) : s.plannedHours}
                  </td>
                  <td>
                    {canEdit ? (
                      <SmallSelect
                        value={s.status}
                        disabled={savingKey === s.key}
                        onChange={(e) => patchStage(s, { status: e.target.value as StageStatus })}
                      >
                        {STAGE_STATUSES.map((x) => (
                          <option key={x} value={x}>{t.stageStatuses[x]}</option>
                        ))}
                      </SmallSelect>
                    ) : t.stageStatuses[s.status]}
                  </td>
                  <DesktopCell>{s.startedAt ? formatDate(s.startedAt) : '—'}</DesktopCell>
                  <DesktopCell>{s.completedAt ? formatDate(s.completedAt) : '—'}</DesktopCell>
                </tr>
              ))}
              <TotalRow>
                <td>{t.totalRow}</td>
                <td>{total}</td>
                <td />
                <DesktopCell />
                <DesktopCell />
              </TotalRow>
            </tbody>
          </Table>
        </TableScroll>
      </Panel>
    </>
  );
}
