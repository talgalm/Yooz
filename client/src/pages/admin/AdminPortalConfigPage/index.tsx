import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminPortalConfigPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import {
  AdminHeader,
  PrimaryButton,
  OutlineButton,
  Input,
  StatusBadge,
} from '../../../components/styled';
import {
  PageTopRow,
  PageTitle,
  SectionLabel,
  SectionDescription,
  SmallDangerButton,
  SmallOutlineButton,
  VerticalStackGap12,
  FormSectionCard,
  AdminCardForm,
} from '../styled';

// ─── Local styled ───

const PageBg = styled('div')({
  minHeight: '100vh',
  direction: 'rtl',
  background: 'linear-gradient(160deg, #f5edf4 0%, #eee8f8 40%, #f5f5f7 100%)',
});

const Content = styled('main')({
  maxWidth: 900,
  margin: '0 auto',
  padding: '32px clamp(20px, 3vw, 40px) 48px',
  boxSizing: 'border-box',
});

const UserRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  padding: 12,
  background: '#f9f9fb',
  borderRadius: 10,
  border: '1px solid #e8e8ec',
});

const UserField = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flex: 1,
  minWidth: 120,
});

const FieldLabel = styled('label')({
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
});

const UserInput = styled(Input)({
  padding: '8px 10px',
  fontSize: 13,
});

const PasswordRow = styled('div')({
  display: 'flex',
  gap: 4,
  alignItems: 'center',
});

const GenerateBtn = styled(OutlineButton)({
  padding: '7px 10px',
  fontSize: 11,
  whiteSpace: 'nowrap',
});

const ActivityPickerRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  marginBottom: 12,
});

const ActivitySelect = styled('select')({
  flex: 1,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1.5px solid #e0dce8',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
  color: '#333',
});

const AttachedActivityItem = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  background: '#f9f9fb',
  borderRadius: 10,
  border: '1px solid #e8e8ec',
});

const ActivityInfo = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
});

const PortalLinkRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  padding: '10px 14px',
  background: '#f0eefa',
  borderRadius: 10,
  marginBottom: 16,
});

const LinkCode = styled('code')({
  flex: 1,
  fontSize: 13,
  wordBreak: 'break-all',
  color: '#6c5ce7',
});

const SuccessMsg = styled('div')({
  color: '#2e7d32',
  fontWeight: 600,
  fontSize: 14,
  marginTop: 8,
});

const ErrorMsg = styled('div')({
  color: '#c62828',
  fontWeight: 600,
  fontSize: 14,
  marginTop: 8,
});

// ─── Pending user row ───

const PendingUserRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 14px',
  background: '#fff8e1',
  borderRadius: 10,
  border: '1px solid #ffe082',
});

const PendingUserInfo = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const PendingUsername = styled('span')({
  fontWeight: 600,
  fontSize: 14,
  color: '#333',
});

const PendingDate = styled('span')({
  fontSize: 11,
  color: '#999',
});

const PendingActions = styled('div')({
  display: 'flex',
  gap: 6,
});

const ApproveBtn = styled('button')({
  padding: '6px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#2e7d32',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'background 0.2s',
  '&:hover': { background: '#1b5e20' },
  '&:disabled': { opacity: 0.5 },
});

const DenyBtn = styled('button')({
  padding: '6px 14px',
  borderRadius: 8,
  border: '1.5px solid #c62828',
  background: '#fff',
  color: '#c62828',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': { background: '#ffebee' },
  '&:disabled': { opacity: 0.5 },
});

const StatusChip = styled('span')<{ userStatus: 'pending' | 'approved' | 'denied' }>(({ userStatus }) => ({
  display: 'inline-block',
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  background: userStatus === 'approved' ? '#e8f5e9' : userStatus === 'denied' ? '#ffebee' : '#fff8e1',
  color: userStatus === 'approved' ? '#2e7d32' : userStatus === 'denied' ? '#c62828' : '#e65100',
}));

const EmptyPending = styled('div')({
  textAlign: 'center',
  padding: 16,
  color: '#aaa',
  fontSize: 13,
});

// ─── Types ───

interface PortalUser {
  username: string;
  password: string;
}

interface PortalUserFull {
  _id: string;
  username: string;
  password: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

interface AttachedActivity {
  _id: string;
  name: string;
  code: string;
  status: string;
}

interface AvailableActivity {
  _id: string;
  name: string;
  code: string;
  status: string;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminPortalConfigPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [portalCode, setPortalCode] = useState('');
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [allPortalUsers, setAllPortalUsers] = useState<PortalUserFull[]>([]);
  const [attachedActivities, setAttachedActivities] = useState<AttachedActivity[]>([]);
  const [availableActivities, setAvailableActivities] = useState<AvailableActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch available activities
  useEffect(() => {
    adminApiFetch<{ activities: AvailableActivity[] }>('/api/admin/activities')
      .then((res) => setAvailableActivities(res.activities))
      .catch(() => {});
  }, []);

  // Fetch portal data if editing
  useEffect(() => {
    if (!isEdit) return;
    adminApiFetch<{ portal: any }>(`/api/admin/portals/${id}`)
      .then((res) => {
        const p = res.portal;
        setName(p.name);
        setDescription(p.description || '');
        setPortalCode(p.code);
        setAllPortalUsers(p.users || []);
        // Only show approved users in the editable list
        setUsers(
          (p.users || [])
            .filter((u: any) => u.status === 'approved')
            .map((u: any) => ({
              username: u.username,
              password: u.password,
            }))
        );
        setAttachedActivities(p.activities || []);
      })
      .catch(() => setErrorMsg(t.error));
  }, [id, isEdit]);

  const pendingUsers = allPortalUsers.filter(u => u.status === 'pending');
  const deniedUsers = allPortalUsers.filter(u => u.status === 'denied');

  const addUser = () => {
    setUsers([...users, { username: '', password: '' }]);
  };

  const updateUser = (index: number, field: keyof PortalUser, value: string) => {
    const updated = [...users];
    updated[index] = { ...updated[index], [field]: value };
    setUsers(updated);
  };

  const removeUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const generatePassword = (index: number) => {
    updateUser(index, 'password', generateRandomPassword());
  };

  const attachActivity = () => {
    if (!selectedActivityId) return;
    const activity = availableActivities.find((a) => a._id === selectedActivityId);
    if (!activity) return;
    if (attachedActivities.some((a) => a._id === selectedActivityId)) return;
    setAttachedActivities([...attachedActivities, activity]);
    setSelectedActivityId('');
  };

  const detachActivity = (activityId: string) => {
    setAttachedActivities(attachedActivities.filter((a) => a._id !== activityId));
  };

  const handleUserStatusChange = async (userId: string, status: 'approved' | 'denied') => {
    try {
      await adminApiFetch(`/api/admin/portals/${id}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Update local state
      setAllPortalUsers(prev =>
        prev.map(u => u._id === userId ? { ...u, status } : u)
      );
      // If approved, add to editable users list
      if (status === 'approved') {
        const user = allPortalUsers.find(u => u._id === userId);
        if (user && !users.some(u => u.username === user.username)) {
          setUsers(prev => [...prev, { username: user.username, password: user.password }]);
        }
      }
    } catch {
      setErrorMsg(t.error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const payload = {
      name,
      description: description || undefined,
      users: users.filter((u) => u.username && u.password),
      activities: attachedActivities.map((a) => a._id),
    };

    try {
      if (isEdit) {
        await adminApiFetch(`/api/admin/portals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await adminApiFetch<{ portal: { _id: string; code: string } }>('/api/admin/portals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setPortalCode(res.portal.code);
      }
      setSuccessMsg(t.saved);
    } catch {
      setErrorMsg(t.error);
    } finally {
      setSaving(false);
    }
  };

  const portalLink = portalCode ? `${window.location.origin}/portal/${portalCode}` : '';

  const copyLink = () => {
    if (!portalLink) return;
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter out already-attached activities from dropdown
  const unattachedActivities = availableActivities.filter(
    (a) => !attachedActivities.some((att) => att._id === a._id)
  );

  return (
    <PageBg>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
      </AdminHeader>

      <Content>
        <PageTopRow>
          <PageTitle>{isEdit ? t.editTitle : t.createTitle}</PageTitle>
          <OutlineButton onClick={() => navigate('/admin/dashboard?tab=portals')}>{t.back}</OutlineButton>
        </PageTopRow>

        <AdminCardForm>
          <VerticalStackGap12>
            {/* Portal Link (edit mode) */}
            {portalCode && (
              <PortalLinkRow>
                <FieldLabel style={{ whiteSpace: 'nowrap' }}>{t.portalLink}:</FieldLabel>
                <LinkCode>{portalLink}</LinkCode>
                <SmallOutlineButton onClick={copyLink}>
                  {copied ? t.copied : t.copy}
                </SmallOutlineButton>
              </PortalLinkRow>
            )}

            {/* Basic Info */}
            <FormSectionCard>
              <SectionLabel>{t.portalName}</SectionLabel>
              <Input
                placeholder={t.portalNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <SectionLabel>{t.description}</SectionLabel>
              <Input
                placeholder={t.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormSectionCard>

            {/* Pending Registrations (edit mode only) */}
            {isEdit && (pendingUsers.length > 0 || deniedUsers.length > 0) && (
              <FormSectionCard>
                <SectionLabel>{t.pendingUsersSection}</SectionLabel>
                <SectionDescription>{t.pendingUsersDescription}</SectionDescription>

                {pendingUsers.length === 0 && deniedUsers.length === 0 && (
                  <EmptyPending>{t.noPendingUsers}</EmptyPending>
                )}

                <VerticalStackGap12>
                  {pendingUsers.map((user) => (
                    <PendingUserRow key={user._id}>
                      <PendingUserInfo>
                        <PendingUsername>{user.username}</PendingUsername>
                        <PendingDate>{new Date(user.createdAt).toLocaleDateString()}</PendingDate>
                      </PendingUserInfo>
                      <PendingActions>
                        <ApproveBtn onClick={() => handleUserStatusChange(user._id, 'approved')}>
                          {t.approve}
                        </ApproveBtn>
                        <DenyBtn onClick={() => handleUserStatusChange(user._id, 'denied')}>
                          {t.deny}
                        </DenyBtn>
                      </PendingActions>
                    </PendingUserRow>
                  ))}
                  {deniedUsers.map((user) => (
                    <PendingUserRow key={user._id} style={{ background: '#ffebee', borderColor: '#ef9a9a' }}>
                      <PendingUserInfo>
                        <PendingUsername>{user.username}</PendingUsername>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <PendingDate>{new Date(user.createdAt).toLocaleDateString()}</PendingDate>
                          <StatusChip userStatus="denied">{t.denied}</StatusChip>
                        </div>
                      </PendingUserInfo>
                      <PendingActions>
                        <ApproveBtn onClick={() => handleUserStatusChange(user._id, 'approved')}>
                          {t.approve}
                        </ApproveBtn>
                      </PendingActions>
                    </PendingUserRow>
                  ))}
                </VerticalStackGap12>
              </FormSectionCard>
            )}

            {/* Users Section */}
            <FormSectionCard>
              <SectionLabel>{t.usersSection}</SectionLabel>
              <SectionDescription>{t.usersDescription}</SectionDescription>

              {users.map((user, index) => (
                <UserRow key={index}>
                  <UserField>
                    <FieldLabel>{t.username}</FieldLabel>
                    <UserInput
                      value={user.username}
                      onChange={(e) => updateUser(index, 'username', e.target.value)}
                    />
                  </UserField>
                  <UserField>
                    <FieldLabel>{t.password}</FieldLabel>
                    <PasswordRow>
                      <UserInput
                        value={user.password.startsWith('$2') ? '********' : user.password}
                        onChange={(e) => updateUser(index, 'password', e.target.value)}
                      />
                      <GenerateBtn onClick={() => generatePassword(index)}>
                        {t.generatePassword}
                      </GenerateBtn>
                    </PasswordRow>
                  </UserField>
                  <SmallDangerButton onClick={() => removeUser(index)}>
                    {t.removeUser}
                  </SmallDangerButton>
                </UserRow>
              ))}

              <SmallOutlineButton onClick={addUser}>{t.addUser}</SmallOutlineButton>
            </FormSectionCard>

            {/* Activities Section */}
            <FormSectionCard>
              <SectionLabel>{t.activitiesSection}</SectionLabel>
              <SectionDescription>{t.activitiesDescription}</SectionDescription>

              <ActivityPickerRow>
                <ActivitySelect
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                >
                  <option value="">{t.selectActivity}</option>
                  {unattachedActivities.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </ActivitySelect>
                <SmallOutlineButton onClick={attachActivity} disabled={!selectedActivityId}>
                  {t.attachActivity}
                </SmallOutlineButton>
              </ActivityPickerRow>

              <VerticalStackGap12>
                {attachedActivities.map((activity) => (
                  <AttachedActivityItem key={activity._id}>
                    <ActivityInfo>
                      <strong>{activity.name}</strong>
                      <code style={{ color: '#888', fontSize: 12 }}>{activity.code}</code>
                      <StatusBadge status={activity.status as 'preview' | 'live'}>
                        {activity.status}
                      </StatusBadge>
                    </ActivityInfo>
                    <SmallDangerButton onClick={() => detachActivity(activity._id)}>
                      {t.detach}
                    </SmallDangerButton>
                  </AttachedActivityItem>
                ))}
              </VerticalStackGap12>
            </FormSectionCard>

            {/* Save */}
            <PrimaryButton onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? t.saving : t.save}
            </PrimaryButton>

            {successMsg && <SuccessMsg>{successMsg}</SuccessMsg>}
            {errorMsg && <ErrorMsg>{errorMsg}</ErrorMsg>}
          </VerticalStackGap12>
        </AdminCardForm>
      </Content>
    </PageBg>
  );
}
