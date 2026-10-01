import { useEffect, useState, useCallback, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageEmployeesPage.i18n';
import ConfirmDialog from '../ConfirmDialog';
import { formatMoney } from '../manageTypes';
import { Table, TEXT_LIGHT } from '../../../components/styled';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, Button, GhostButton,
  LinkButton, Pill, EmptyState, ErrorNote, ModalBackdrop, ModalCard, ModalTitle,
  ModalActions, FieldGrid, Field, SmallInput, SmallSelect, MOBILE,
} from '../manageUi';

interface Employee {
  _id: string;
  name: string;
  role: 'owner' | 'pm' | 'member';
  active: boolean;
  tracksTime: boolean;
  color?: string;
  weeklyCapacityHours: number;
  monthHours: number;
  monthTravel: number;
  email?: string;
  phone?: string;
  hourlyCost?: number;
  employerCostFactor?: number;
  effectiveHourlyCost?: number;
  monthCost?: number;
}

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });
const Inactive = styled('tr')<{ off?: boolean }>(({ off }) => ({ opacity: off ? 0.5 : 1 }));
const Actions = styled('div')({ display: 'flex', gap: 10, flexWrap: 'wrap' });
const Note = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 10 });
const ColorDot = styled('span')<{ tone: string }>(({ tone }) => ({
  display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
  background: tone, marginInlineEnd: 8, verticalAlign: 'middle',
}));

export default function ManageEmployeesPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const isOwner = user?.role === 'owner';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await manageApiFetch<{ employees: Employee[] }>(
        `/api/manage/employees${showInactive ? '?all=true' : ''}`,
      );
      setEmployees(r.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const deactivate = async () => {
    if (!deactivating) return;
    try {
      await manageApiFetch(`/api/manage/employees/${deactivating._id}`, { method: 'DELETE' });
      setDeactivating(null);
      load();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setDeactivating(null);
    }
  };

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
      </PageHeader>

      <Toolbar>
        <GhostButton onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? t.hideInactive : t.showInactive}
        </GhostButton>
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : (
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.role}</th>
                  <DesktopHead>{t.capacity}</DesktopHead>
                  <th>{t.monthHours}</th>
                  <DesktopHead>{t.monthTravel}</DesktopHead>
                  {isOwner && <DesktopHead>{t.effectiveCost}</DesktopHead>}
                  {isOwner && <DesktopHead>{t.monthCost}</DesktopHead>}
                  {isOwner && <th>{t.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <Inactive key={e._id} off={!e.active} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>
                      <ColorDot tone={e.color ?? '#8d86a3'} />
                      {e.name}
                      {!e.active && <> <Pill tone="muted">{t.inactive}</Pill></>}
                      {!e.tracksTime && <> <Pill tone="muted">{t.noTimeTracking}</Pill></>}
                      {isOwner && e.email && (
                        <div style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 400 }}>{e.email}</div>
                      )}
                    </td>
                    <td>{t.roles[e.role]}</td>
                    <DesktopCell>{e.weeklyCapacityHours}</DesktopCell>
                    <td><b>{e.monthHours}</b></td>
                    <DesktopCell>{formatMoney(e.monthTravel ?? 0)}</DesktopCell>
                    {isOwner && <DesktopCell>{formatMoney(e.effectiveHourlyCost ?? 0)}</DesktopCell>}
                    {isOwner && <DesktopCell>{formatMoney(e.monthCost ?? 0)}</DesktopCell>}
                    {isOwner && (
                      <td>
                        <Actions>
                          <LinkButton onClick={() => setEditing(e)}>{t.edit}</LinkButton>
                          {e.active && e._id !== user?._id && (
                            <LinkButton onClick={() => setDeactivating(e)}>{t.deactivate}</LinkButton>
                          )}
                        </Actions>
                      </td>
                    )}
                  </Inactive>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Panel>

      <Note>{t.deactivateNote}</Note>
      <Note>{t.addInAdmin}</Note>

      {editing && (
        <EmployeeModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deactivating && (
        <ConfirmDialog
          title={t.deactivate}
          message={t.confirmDeactivate(deactivating.name)}
          confirmLabel={t.deactivate}
          onCancel={() => setDeactivating(null)}
          onConfirm={deactivate}
        />
      )}
    </>
  );
}

function EmployeeModal({ employee, onClose, onSaved }: {
  employee: Employee; onClose: () => void; onSaved: () => void;
}) {
  const t = useTranslations(texts);
  const [name, setName] = useState(employee.name ?? '');
  const [role, setRole] = useState(employee.role ?? 'member');
  const [weeklyCapacityHours, setCapacity] = useState(String(employee.weeklyCapacityHours ?? 40));
  const [hourlyCost, setHourlyCost] = useState(String(employee.hourlyCost ?? 0));
  const [tracksTime, setTracksTime] = useState(employee.tracksTime ?? true);
  const [color, setColor] = useState(employee.color ?? '#6c5ce7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name, role, tracksTime, color,
        weeklyCapacityHours: Number(weeklyCapacityHours) || 40,
        hourlyCost: Number(hourlyCost) || 0,
      };
      await manageApiFetch(`/api/manage/employees/${employee._id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{t.editEmployee}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.name}
              <SmallInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <Field>
              {t.role}
              <SmallSelect value={role} onChange={(e) => setRole(e.target.value as Employee['role'])}>
                <option value="member">{t.roles.member}</option>
                <option value="pm">{t.roles.pm}</option>
                <option value="owner">{t.roles.owner}</option>
              </SmallSelect>
            </Field>
            <Field>
              {t.capacity}
              <SmallInput type="number" min="0" value={weeklyCapacityHours} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
            <Field>
              {t.hourlyCost}
              <SmallInput type="number" min="0" value={hourlyCost} onChange={(e) => setHourlyCost(e.target.value)} />
            </Field>
            <Field>
              {t.color}
              <SmallInput
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ padding: 2, height: 36 }}
              />
            </Field>
          </FieldGrid>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={tracksTime} onChange={(e) => setTracksTime(e.target.checked)} />
            {t.tracksTime}
          </label>
          <Note>{t.tracksTimeNote}</Note>
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
