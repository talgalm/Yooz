import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslations } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { texts } from './AdminViewActivityPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import {
  AdminHeader,
  OutlineButton,
  Badge,
  ModalOverlay,
  ModalCard,
  ConfirmButton,
} from '../../../components/styled';
import {
  ModalTitle,
  ModalActions,
  ModalBodyText,
} from '../styled';
import ManagerLoginModal from '../../../components/login/ManagerLoginModal';

// ─── Styled Components ───

const PageBg = styled('div')({
  minHeight: '100vh',
  direction: 'rtl',
  background: 'linear-gradient(160deg, #f5edf4 0%, #eee8f8 40%, #f5f5f7 100%)',
});

const ContentWrapper = styled('div')({
  maxWidth: 700,
  margin: '0 auto',
  padding: '36px 24px 48px',
  '@media (max-width: 600px)': {
    padding: '24px 16px 36px',
  },
});

const PageTitleText = styled('h1')({
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: '#222',
  textAlign: 'center',
  letterSpacing: -0.3,
});

const PageDateText = styled('div')({
  textAlign: 'center',
  fontSize: 14,
  color: '#999',
  marginTop: 6,
  marginBottom: 28,
});

const TopGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginBottom: 16,
  '@media (max-width: 640px)': {
    gridTemplateColumns: '1fr',
  },
});

const CardBox = styled('div')({
  background: '#fff',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
});

const CardHeaderDark = styled('div')({
  background: '#4a4558',
  padding: '14px 20px',
  textAlign: 'center',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.2,
});

const CardHeaderLight = styled('div')({
  background: '#f9f8fb',
  padding: '14px 20px',
  textAlign: 'center',
  color: '#333',
  fontSize: 15,
  fontWeight: 700,
  borderBottom: '1px solid #eee',
});

const CardContent = styled('div')({
  padding: 20,
});

const ActivityDisplay = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  paddingBottom: 14,
});

const ActivityIcon = styled('div')({
  fontSize: 52,
  lineHeight: 1,
  marginBottom: 4,
});

const ActivityNameStyled = styled('div')({
  fontSize: 18,
  fontWeight: 800,
  color: '#222',
  textAlign: 'center',
  lineHeight: 1.4,
});

const ModuleBadge = styled('span')({
  display: 'inline-block',
  padding: '4px 16px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  background: '#f0eefa',
  color: '#6c5ce7',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginTop: 4,
});

const CardDivider = styled('hr')({
  border: 'none',
  borderTop: '1px solid #eee',
  margin: '14px 0',
});

const PlayLinkLabel = styled('div')({
  fontSize: 13,
  color: '#555',
  marginBottom: 8,
  fontWeight: 500,
  textAlign: 'start',
});

const PlayLinkBox = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#f5f5f7',
  borderRadius: 10,
  padding: '8px 12px',
});

const PlayLinkUrl = styled('code')({
  flex: 1,
  fontSize: 12,
  color: '#555',
  wordBreak: 'break-all',
  fontFamily: 'monospace',
});

const CopyIconBtn = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: '#6c5ce7',
  padding: '4px 6px',
  borderRadius: 6,
  flexShrink: 0,
  '&:hover': { background: '#f0eefa' },
});

const ReviewRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 0',
  '&:not(:last-child)': {
    borderBottom: '1px solid #f0f0f4',
  },
});

const ReviewIcon = styled('span')({
  fontSize: 18,
  width: 28,
  textAlign: 'center',
  flexShrink: 0,
});

const ReviewLabel = styled('span')({
  fontSize: 14,
  color: '#666',
  whiteSpace: 'nowrap',
});

const ReviewBadges = styled('div')({
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginInlineStart: 'auto',
});

const LinkCardBox = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '18px 20px',
  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
});

const LinkCardLabel = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: '#555',
  whiteSpace: 'nowrap',
});

const LinkCardUrlBox = styled('div')({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#f5f5f7',
  borderRadius: 10,
  padding: '10px 14px',
  minWidth: 0,
});

const LinkCardUrlText = styled('code')({
  flex: 1,
  fontSize: 13,
  color: '#555',
  wordBreak: 'break-all',
  fontFamily: 'monospace',
});

const CopyLinkBtn = styled('button')({
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  background: '#f0f0f4',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  '&:hover': { background: '#e8e8ec' },
});

const QrCardBox = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '24px 20px',
  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
  marginBottom: 28,
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  flexWrap: 'wrap',
  '@media (max-width: 500px)': {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const QrTextSection = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const QrMainTitle = styled('div')({
  fontSize: 17,
  fontWeight: 800,
  color: '#222',
});

const QrSubtitle = styled('div')({
  fontSize: 12,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const QrHint = styled('div')({
  fontSize: 13,
  color: '#888',
  marginTop: 4,
});

const DownloadBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0',
  fontSize: 13,
  fontWeight: 600,
  color: '#6c5ce7',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: 10,
  '&:hover': { textDecoration: 'underline' },
});

const QrImageWrapper = styled('div')({
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(108,92,231,0.10)',
  lineHeight: 0,
  padding: 8,
  background: '#fff',
});

const ButtonsRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
});

const ActionGroup = styled('div')({
  display: 'flex',
  gap: 10,
});

const StatsBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 24px',
  fontSize: 15,
  fontWeight: 700,
  color: '#6c5ce7',
  background: '#fff',
  border: '2px solid #6c5ce7',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': { background: '#f0eefa' },
  '&:active': { transform: 'scale(0.98)' },
});

const EditBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 28px',
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  background: '#6c5ce7',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'transform 0.1s',
  '&:active': { transform: 'scale(0.98)' },
});

const DeleteBtn = styled('button', {
  shouldForwardProp: (prop) => prop !== 'confirm',
})<{ confirm?: boolean }>(({ confirm }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 24px',
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  background: confirm ? '#111' : '#e74c3c',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
  '&:active': { background: confirm ? '#000' : '#c0392b' },
}));

const LockBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 700,
  color: '#6c5ce7',
  background: '#fff',
  border: '2px solid #6c5ce7',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': { background: '#f0eefa' },
  '&:active': { transform: 'scale(0.98)' },
});

const HeaderActionsRow = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
});

const ManagerIconBtn = styled('button')({
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: '1px solid #d8d2e0',
  background: '#fff',
  color: '#6c5ce7',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  fontFamily: 'inherit',
  transition: 'background 0.15s, border-color 0.15s',
  '&:hover': { background: '#f0eefa', borderColor: '#6c5ce7' },
  '&:active': { transform: 'scale(0.97)' },
});

// ─── Types ───

interface Activity {
  _id: string;
  code: string;
  name: string;
  status: 'preview' | 'live';
  loginFields: string[];
  emailGoogle?: boolean;
  connectionType: string;
  groups: { name: string }[];
  module?: {
    type: string;
    backgroundImage?: string;
    items: { type: 'game' | 'station'; ref?: string; data?: { _id: string; name: string; type?: string } }[];
  };
  createdAt: number;
  customerEditLocked?: boolean;
  managerEmail?: string;
  managerHasPassword?: boolean;
}

// ─── Game/module icons ───

const GAME_ICONS: Record<string, string> = {
  trivia: '❓', order: '🔢', puzzle: '🧩', trueFalse: '✅',
  ballGame: '🏀', trashSort: '♻️',
};

const MODULE_ICONS: Record<string, string> = {
  mission: '🗺️', story: '📖',
};

function getActivityIcon(activity: Activity): string {
  if (activity.module?.items.length) {
    const first = activity.module.items[0];
    if (first.type === 'game' && first.data?.type) {
      return GAME_ICONS[first.data.type] || '🎮';
    }
  }
  if (activity.module?.type) {
    return MODULE_ICONS[activity.module.type] || '📋';
  }
  return '📋';
}

export default function AdminViewActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [lockSaving, setLockSaving] = useState(false);
  const [managerLoginOpen, setManagerLoginOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const { admin } = useAdminAuth();

  useEffect(() => {
    if (!id) return;
    const fetchActivity = (onError?: () => void) => {
      adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}`)
        .then((data) => setActivity(data.activity))
        .catch(() => { if (onError) onError(); });
    };
    fetchActivity(() => navigate('/admin/dashboard'));
    // Refresh on focus / tab visibility so edits to nested games/stations
    // (made in another page) are reflected here without a manual reload.
    const refresh = () => fetchActivity();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id, navigate]);

  const playUrl = activity ? `${window.location.origin}/play/${activity.code}` : '';

  const handleDownloadQr = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `yooz-qr-${activity?.code || 'activity'}.png`;
    link.href = url;
    link.click();
  }, [activity?.code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(playUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInline = async () => {
    await navigator.clipboard.writeText(playUrl);
    setCopiedInline(true);
    setTimeout(() => setCopiedInline(false), 2000);
  };

  const handleDelete = async () => {
    if (admin?.role === 'customer' && activity?.customerEditLocked) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await adminApiFetch(`/api/admin/activities/${id}`, { method: 'DELETE' });
    navigate('/admin/dashboard');
  };

  const handleToggleCustomerLock = async () => {
    if (!activity || !id) return;
    setLockSaving(true);
    try {
      const data = await adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}/customer-lock`, {
        method: 'PATCH',
        body: JSON.stringify({ locked: !activity.customerEditLocked }),
      });
      setActivity(data.activity);
    } catch {
      // silently fail
    } finally {
      setLockSaving(false);
    }
  };

  const confirmGoLive = async () => {
    setShowGoLiveModal(false);
    try {
      const data = await adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'live' }),
      });
      setActivity(data.activity);
    } catch { /* ignore */ }
  };

  if (!activity) return null;
  const canManageCustomerLock = admin?.role === 'admin' || admin?.role === 'super_admin';
  const customerBlockedByLock = admin?.role === 'customer' && !!activity.customerEditLocked;

  const fieldLabels: Record<string, string> = { name: t.fieldName, email: t.email, phoneNumber: t.phone };

  return (
    <PageBg>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <HeaderActionsRow>
          {activity.managerEmail && (
            <ManagerIconBtn
              type="button"
              aria-label={t.managerLogin}
              title={t.managerLogin}
              onClick={() => setManagerLoginOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </ManagerIconBtn>
          )}
          <OutlineButton onClick={() => navigate('/admin/dashboard')}>{t.back}</OutlineButton>
        </HeaderActionsRow>
      </AdminHeader>

      <ContentWrapper>
        {/* Page title */}
        <PageTitleText>{activity.name}</PageTitleText>
        <PageDateText>{new Date(activity.createdAt).toLocaleDateString()}</PageDateText>

        {/* Two-column cards */}
        <TopGrid>
          {/* Activity & Access card */}
          <CardBox>
            <CardHeaderDark>{t.activityAndAccess}</CardHeaderDark>
            <CardContent>
              <ActivityDisplay>
                <ActivityIcon>{getActivityIcon(activity)}</ActivityIcon>
                <ActivityNameStyled>{activity.name}</ActivityNameStyled>
                {activity.module && (
                  <ModuleBadge>{activity.module.type.toUpperCase()}</ModuleBadge>
                )}
              </ActivityDisplay>
              <CardDivider />
              <PlayLinkLabel>{t.playLink}</PlayLinkLabel>
              <PlayLinkBox>
                <PlayLinkUrl>{playUrl}</PlayLinkUrl>
                <CopyIconBtn onClick={handleCopyInline} title={t.copy}>
                  {copiedInline ? '✓' : '📋'}
                </CopyIconBtn>
              </PlayLinkBox>
            </CardContent>
          </CardBox>

          {/* Activity Review card */}
          <CardBox>
            <CardHeaderLight>{t.activityReview}</CardHeaderLight>
            <CardContent>
              <ReviewRow>
                <ReviewIcon>👤</ReviewIcon>
                <ReviewLabel>{t.memberType}</ReviewLabel>
                <ReviewBadges>
                  <Badge>{activity.connectionType}</Badge>
                </ReviewBadges>
              </ReviewRow>
              <ReviewRow>
                <ReviewIcon>📋</ReviewIcon>
                <ReviewLabel>{t.loginFields}</ReviewLabel>
                <ReviewBadges>
                  {activity.loginFields.map((f) => (
                    <Badge key={f}>{fieldLabels[f] || f}</Badge>
                  ))}
                  {activity.emailGoogle && <Badge>{t.google}</Badge>}
                </ReviewBadges>
              </ReviewRow>
              {activity.module && (
                <ReviewRow>
                  <ReviewIcon>🧩</ReviewIcon>
                  <ReviewLabel>{t.module}</ReviewLabel>
                  <ReviewBadges>
                    <Badge>{activity.module.type}</Badge>
                  </ReviewBadges>
                </ReviewRow>
              )}
              {activity.connectionType === 'group' && activity.groups.length > 0 && (
                <ReviewRow>
                  <ReviewIcon>👥</ReviewIcon>
                  <ReviewLabel>{t.groups}</ReviewLabel>
                  <ReviewBadges>
                    {activity.groups.map((g) => (
                      <Badge key={g.name} style={{ background: '#e8f5e9', color: '#2e7d32' }}>{g.name}</Badge>
                    ))}
                  </ReviewBadges>
                </ReviewRow>
              )}
              <ReviewRow>
                <ReviewIcon>🔒</ReviewIcon>
                <ReviewLabel>{t.customerEditLockStatus}</ReviewLabel>
                <ReviewBadges>
                  <Badge style={activity.customerEditLocked ? { background: '#fde8e8', color: '#c0392b' } : {}}>
                    {activity.customerEditLocked ? t.customerEditLocked : t.customerEditUnlocked}
                  </Badge>
                </ReviewBadges>
              </ReviewRow>
            </CardContent>
          </CardBox>
        </TopGrid>

        {/* QR code card */}
        <QrCardBox>
          <QrTextSection>
            <QrMainTitle>{t.qrQuickAccess}</QrMainTitle>
            <QrSubtitle>{t.qrCode}</QrSubtitle>
            <QrHint>{t.scanToPlay}</QrHint>
            <DownloadBtn onClick={handleDownloadQr}>
              ⬇ {t.downloadQr}
            </DownloadBtn>
          </QrTextSection>
          <QrImageWrapper ref={qrRef}>
            <QRCodeCanvas
              value={playUrl}
              size={120}
              level="H"
              marginSize={1}
            />
          </QrImageWrapper>
        </QrCardBox>

        {/* Action buttons */}
        <ButtonsRow>
          <ActionGroup>
            <EditBtn
              onClick={() => {
                if (customerBlockedByLock) return;
                navigate(`/admin/activities/${id}/edit`);
              }}
              style={customerBlockedByLock ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            >
              ✏️ {t.edit}
            </EditBtn>
            <StatsBtn onClick={() => navigate(`/admin/dashboard?tab=statistics&activityId=${id}`)}>
              📊 {t.stats}
            </StatsBtn>
            {canManageCustomerLock && (
              <LockBtn onClick={handleToggleCustomerLock} disabled={lockSaving}>
                🔒 {activity.customerEditLocked ? t.unlockCustomerEdits : t.lockCustomerEdits}
              </LockBtn>
            )}
          </ActionGroup>
          <DeleteBtn
            confirm={confirmDelete}
            onClick={handleDelete}
            style={customerBlockedByLock ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            🗑 {confirmDelete ? t.confirmDelete : t.delete}
          </DeleteBtn>
        </ButtonsRow>
        {customerBlockedByLock && (
          <PageDateText style={{ marginTop: 12, marginBottom: 0 }}>
            {t.customerEditLockedNotice}
          </PageDateText>
        )}
      </ContentWrapper>

      {showGoLiveModal && (
        <ModalOverlay onClick={() => setShowGoLiveModal(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{t.goLiveTitle}</ModalTitle>
            <ModalBodyText>{t.goLiveMessage}</ModalBodyText>
            <ModalActions>
              <OutlineButton onClick={() => setShowGoLiveModal(false)}>{t.cancel}</OutlineButton>
              <ConfirmButton onClick={confirmGoLive}>{t.confirmGoLive}</ConfirmButton>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {managerLoginOpen && activity.managerEmail && (
        <ManagerLoginModal
          activityCode={activity.code}
          requiresPassword={!!activity.managerHasPassword}
          onClose={() => setManagerLoginOpen(false)}
        />
      )}
    </PageBg>
  );
}
