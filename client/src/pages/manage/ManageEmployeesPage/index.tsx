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

/** Owner manages people here; a pm sees the same table without any money. */
export default function ManageEmployeesPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const isOwner = user?.role === 'owner';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<Employee | null>(null);
  // Plaintext lives only here, only until the dialog closes.
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
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

  const resetPassword = async () => {
    if (!resetting) return;
    try {
      const r = await manageApiFetch<{ password: string }>(
        `/api/manage/employees/${resetting._id}/reset-password`, { method: 'POST' },
      );
      setIssued({ name: resetting.name, password: r.password });
      setResetting(null);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setResetting(null);
    }
  };

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
        {isOwner && <Button onClick={() => setCreating(true)}>{t.addEmployee}</Button>}
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
                    {isOwner && <DesktopCell>{formatMoney(e.effectiveHourlyCost ?? 0)}</DesktopCell>}
                    {isOwner && <DesktopCell>{formatMoney(e.monthCost ?? 0)}</DesktopCell>}
                    {isOwner && (
                      <td>
                        <Actions>
                          <LinkButton onClick={() => setEditing(e)}>{t.edit}</LinkButton>
                          <LinkButton onClick={() => setResetting(e)}>{t.resetPassword}</LinkButton>
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

      {(creating || editing) && (
        <EmployeeModal
          employee={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(password, name) => {
            setCreating(false);
            setEditing(null);
            if (password && name) setIssued({ name, password });
            load();
          }}
        />
      )}
      {resetting && (
        <ConfirmDialog
          title={t.resetPassword}
          message={t.confirmReset(resetting.name)}
          confirmLabel={t.resetPassword}
          danger={false}
          onCancel={() => setResetting(null)}
          onConfirm={resetPassword}
        />
      )}
      {issued && (
        <PasswordIssuedModal
          name={issued.name}
          password={issued.password}
          onClose={() => setIssued(null)}
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
  employee?: Employee;
  onClose: () => void;
  /** On create, hands back the generated password so the owner can pass it on. */
  onSaved: (password?: string, name?: string) => void;
}) {
  const t = useTranslations(texts);
  const [name, setName] = useState(employee?.name ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [role, setRole] = useState(employee?.role ?? 'member');
  const [weeklyCapacityHours, setCapacity] = useState(String(employee?.weeklyCapacityHours ?? 40));
  const [hourlyCost, setHourlyCost] = useState(String(employee?.hourlyCost ?? 0));
  const [tracksTime, setTracksTime] = useState(employee?.tracksTime ?? true);
  const [color, setColor] = useState(employee?.color ?? '#6c5ce7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name, email, role, tracksTime, color,
        weeklyCapacityHours: Number(weeklyCapacityHours) || 40,
        hourlyCost: Number(hourlyCost) || 0,
      };
      const r = await manageApiFetch<{ password?: string }>(
        employee ? `/api/manage/employees/${employee._id}` : '/api/manage/employees',
        { method: employee ? 'PATCH' : 'POST', body: JSON.stringify(body) },
      );
      onSaved(r.password, name);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{employee ? t.editEmployee : t.addEmployee}</ModalTitle>
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <FieldGrid>
            <Field>
              {t.name}
              <SmallInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <Field>
              {t.email}
              <SmallInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
              {/* One colour per person — it is how their tasks read on every board. */}
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
          {!employee && <Note>{t.generatedPasswordNote}</Note>}
          <ModalActions>
            <GhostButton type="button" onClick={onClose}>{t.cancel}</GhostButton>
            <Button type="submit" disabled={saving || !name.trim() || !email.trim()}>
              {saving ? t.saving : t.save}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}

/**
 * Shows a generated password exactly once — it is never stored in plaintext and
 * cannot be looked up again. The employee is asked to change it on first login.
 */
function PasswordIssuedModal({ name, password, onClose }: {
  name: string; password: string; onClose: () => void;
}) {
  const t = useTranslations(texts);
  const [copied, setCopied] = useState(false);

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <ModalTitle>{t.passwordIssued} — {name}</ModalTitle>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>{t.passwordIssuedNote}</div>
        <div style={{
          margin: '14px 0', padding: '12px 14px', borderRadius: 10, background: '#f4f3fb',
          fontFamily: 'monospace', fontSize: 20, letterSpacing: 1, textAlign: 'center',
          direction: 'ltr', userSelect: 'all',
        }}>
          {password}
        </div>
        <ModalActions>
          <GhostButton
            type="button"
            onClick={() => { navigator.clipboard?.writeText(password); setCopied(true); }}
          >
            {copied ? t.copied : t.copy}
          </GhostButton>
          <Button type="button" onClick={onClose}>{t.done}</Button>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  );
}
