import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminUsersTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import {
  Table,
  PrimaryButton,
  OutlineButton,
  Form,
  Input,
  ErrorText,
  SelectionGroup,
  SelectionButton,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
} from '../../../components/styled';
import {
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  FormCard,
  SectionLabel,
  SelectionSubtextSmall,
  FormButtonsRow,
  EmptyText,
  AdminCardNoPadding,
  SmallDangerButton,
  CellBold,
  CellMuted,
  CellAlignEnd,
  MobileCardItemDefault,
  MobileCardHeader,
  MobileCardName,
  InlineRowGap6,
  MobileCardDate,
  RoleBadge,
  LoadingContainer,
  LoadingCenter,
  Spinner,
  SpinKeyframe,
} from '../styled';

type UserRole = 'viewer' | 'admin' | 'super_admin';

interface User {
  _id: string;
  email: string;
  role: UserRole;
  name?: string;
  googleId?: string;
  createdAt: string;
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { admin } = useAdminAuth();
  const t = useTranslations(texts);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ users: User[] }>('/api/admin/users');
      setUsers(data.users);
    } catch {
      // silently fail
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRole('viewer');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (user: User) => {
    setEditingId(user._id);
    setEmail(user.email);
    setName(user.name || '');
    setRole(user.role);
    setPassword('');
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        // Update
        const body: Record<string, unknown> = { email, role, name };
        if (password) body.password = password;
        await adminApiFetch(`/api/admin/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        // Create
        await adminApiFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({ email, password, role, name }),
        });
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await adminApiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const roleLabel = (r: UserRole) => {
    switch (r) {
      case 'viewer': return t.roleViewer;
      case 'admin': return t.roleAdmin;
      case 'super_admin': return t.roleSuperAdmin;
    }
  };

  const isSelf = (userId: string) => {
    // Compare by email since old tokens may not have userId
    const user = users.find((u) => u._id === userId);
    return user && admin && user.email === admin.email;
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        {!showForm && (
          <SmallActionButton onClick={() => { resetForm(); setShowForm(true); }}>
            {t.createNew}
          </SmallActionButton>
        )}
      </SectionHeaderRow>

      {showForm && (
        <FormCard>
          <Form onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder={editingId ? t.passwordOptional : t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...(!editingId && { required: true })}
            />
            <Input
              placeholder={t.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <SectionLabel>{t.role}</SectionLabel>
              <SelectionGroup>
                <SelectionButton type="button" selected={role === 'viewer'} onClick={() => setRole('viewer')}>
                  <div>{t.roleViewer}</div>
                  <SelectionSubtextSmall>{t.roleViewerDesc}</SelectionSubtextSmall>
                </SelectionButton>
                <SelectionButton type="button" selected={role === 'admin'} onClick={() => setRole('admin')}>
                  <div>{t.roleAdmin}</div>
                  <SelectionSubtextSmall>{t.roleAdminDesc}</SelectionSubtextSmall>
                </SelectionButton>
                <SelectionButton type="button" selected={role === 'super_admin'} onClick={() => setRole('super_admin')}>
                  <div>{t.roleSuperAdmin}</div>
                  <SelectionSubtextSmall>{t.roleSuperAdminDesc}</SelectionSubtextSmall>
                </SelectionButton>
              </SelectionGroup>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <FormButtonsRow>
              <PrimaryButton type="submit" disabled={loading || !email.trim()}>
                {loading
                  ? (editingId ? t.saving : t.creating)
                  : (editingId ? t.save : t.create)}
              </PrimaryButton>
              <OutlineButton type="button" onClick={resetForm}>
                {t.cancel}
              </OutlineButton>
            </FormButtonsRow>
          </Form>
        </FormCard>
      )}

      {initialLoading && users.length === 0 ? (
        <LoadingContainer>
          <LoadingCenter>
            <SpinKeyframe />
            <Spinner />
          </LoadingCenter>
        </LoadingContainer>
      ) : users.length === 0 ? (
        <EmptyText>{t.noUsers}</EmptyText>
      ) : (
        <PaginatedUsers users={users} confirmDeleteId={confirmDeleteId} handleEdit={handleEdit} handleDelete={handleDelete} roleLabel={roleLabel} isSelf={isSelf} t={t} />
      )}
    </>
  );
}

function PaginatedUsers({ users, confirmDeleteId, handleEdit, handleDelete, roleLabel, isSelf, t }: {
  users: User[];
  confirmDeleteId: string | null;
  handleEdit: (user: User) => void;
  handleDelete: (id: string) => void;
  roleLabel: (r: UserRole) => string;
  isSelf: (id: string) => boolean;
  t: Record<string, string>;
}) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(users);

  return (
    <>
      <DesktopOnly>
        <AdminCardNoPadding>
          <Table>
            <thead>
              <tr>
                <th>{t.email}</th>
                <th>{t.name}</th>
                <th>{t.role}</th>
                <th>{t.created}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((user) => (
                <tr key={user._id}>
                  <td><CellBold>{user.email}</CellBold></td>
                  <td><CellMuted>{user.name || '—'}</CellMuted></td>
                  <td><RoleBadge role={user.role}>{roleLabel(user.role)}</RoleBadge></td>
                  <td><CellMuted>{new Date(user.createdAt).toLocaleDateString()}</CellMuted></td>
                  <CellAlignEnd>
                    <SmallActionButton onClick={() => handleEdit(user)} style={{ marginInlineEnd: 6 }}>
                      {t.edit}
                    </SmallActionButton>
                    {!isSelf(user._id) && (
                      <SmallDangerButton
                        confirm={confirmDeleteId === user._id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(user._id); }}
                      >
                        {confirmDeleteId === user._id ? t.confirmDelete : t.delete}
                      </SmallDangerButton>
                    )}
                  </CellAlignEnd>
                </tr>
              ))}
            </tbody>
          </Table>
        </AdminCardNoPadding>
      </DesktopOnly>

      <HideOnDesktop>
        <MobileCardList>
          {pageItems.map((user) => (
            <MobileCardItemDefault key={user._id}>
              <MobileCardHeader>
                <MobileCardName>{user.email}</MobileCardName>
                <InlineRowGap6>
                  <SmallActionButton onClick={() => handleEdit(user)}>
                    {t.edit}
                  </SmallActionButton>
                  {!isSelf(user._id) && (
                    <SmallDangerButton
                      confirm={confirmDeleteId === user._id}
                      onClick={() => handleDelete(user._id)}
                    >
                      {confirmDeleteId === user._id ? t.confirmDelete : t.delete}
                    </SmallDangerButton>
                  )}
                </InlineRowGap6>
              </MobileCardHeader>
              <InlineRowGap6>
                <RoleBadge role={user.role}>{roleLabel(user.role)}</RoleBadge>
                {user.name && <CellMuted>{user.name}</CellMuted>}
                <MobileCardDate>{new Date(user.createdAt).toLocaleDateString()}</MobileCardDate>
              </InlineRowGap6>
            </MobileCardItemDefault>
          ))}
        </MobileCardList>
      </HideOnDesktop>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}
