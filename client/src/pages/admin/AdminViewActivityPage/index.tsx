import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminViewActivityPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  OutlineButton,
  Badge,
  StatusBadge,
  CopyButton,
  DangerButton,
  ModalOverlay,
  ModalCard,
  ConfirmButton,
} from '../../../components/styled';
import {
  ModalTitle,
  ModalActions,
  ModalBodyText,
} from '../styled';

// ─── Styled Components ───

const ViewCard = styled('div')({
  width: '100%',
  maxWidth: 800,
  background: '#fff',
  borderRadius: 20,
  padding: 0,
  boxShadow: '0 14px 40px rgba(108,92,231,0.08)',
  border: '1px solid #ececf3',
  overflow: 'hidden',
});

const HeaderSection = styled('div')({
  padding: '32px 36px 24px',
  borderBottom: '1px solid #f0f0f4',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  '@media (max-width: 600px)': {
    padding: '24px 20px 20px',
  },
});

const HeaderLeft = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const ActivityName = styled('h1')({
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  color: '#222',
  letterSpacing: -0.3,
});

const HeaderMeta = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});

const CodeBadge = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'monospace',
  borderRadius: 8,
  background: '#f5f3ff',
  color: '#6c5ce7',
  letterSpacing: 0.5,
});

const DateText = styled('span')({
  fontSize: 13,
  color: '#aaa',
});

const HeaderRight = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 8,
});

const StatusRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const StatusToggle = styled('button')({
  padding: '4px 14px',
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid #ddd',
  borderRadius: 6,
  background: 'none',
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#f5f5f7' },
});

const BodySection = styled('div')({
  padding: '24px 36px',
  '@media (max-width: 600px)': {
    padding: '20px 20px',
  },
});

const InfoGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
  },
});

const InfoCard = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '16px 18px',
  borderRadius: 12,
  background: '#fafafa',
  border: '1px solid #f0f0f4',
});

const InfoLabel = styled('span')({
  fontSize: 12,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const InfoValue = styled('div')({
  fontSize: 15,
  fontWeight: 600,
  color: '#333',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
});

const ItemsSection = styled('div')({
  marginTop: 20,
});

const ItemsSectionTitle = styled('div')({
  fontSize: 13,
  fontWeight: 700,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 10,
});

const ItemsList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

const ItemRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 10,
  background: '#fafafa',
  border: '1px solid #f0f0f4',
});

const ItemIndex = styled('span')({
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  background: '#f0eefa',
  color: '#6c5ce7',
  flexShrink: 0,
});

const ItemName = styled('span')({
  flex: 1,
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
});

const ItemTypePill = styled('span')<{ itemType: 'game' | 'station' }>(({ itemType }) => ({
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 4,
  background: itemType === 'game' ? '#e8f5e9' : '#e3f2fd',
  color: itemType === 'game' ? '#2e7d32' : '#1565c0',
  textTransform: 'uppercase',
}));

const LinkSection = styled('div')({
  margin: '20px 0 0',
  padding: '20px 22px',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
  border: '1px solid #e8e0ff',
});

const LinkLabel = styled('div')({
  fontSize: 12,
  fontWeight: 700,
  color: '#6c5ce7',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 10,
});

const LinkRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});

const LinkUrl = styled('code')({
  flex: 1,
  fontSize: 14,
  wordBreak: 'break-all',
  color: '#444',
  minWidth: 0,
  fontFamily: 'monospace',
});

const FooterSection = styled('div')({
  padding: '20px 36px 28px',
  borderTop: '1px solid #f0f0f4',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  '@media (max-width: 600px)': {
    padding: '16px 20px 24px',
  },
});

const EditButton = styled('button')({
  padding: '10px 28px',
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  background: '#6c5ce7',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'transform 0.1s',
  '&:active': { transform: 'scale(0.98)' },
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
}

// ─── Game icons ───

const GAME_ICONS: Record<string, string> = {
  trivia: '❓', order: '🔢', puzzle: '🧩', trueFalse: '✅',
  ballGame: '🏀', trashSort: '♻️',
};
const STATION_ICONS: Record<string, string> = {
  text: '📝', video: '🎬', image: '🖼️', narrative: '📖', badge: '🏅',
};

export default function AdminViewActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const navigate = useNavigate();
  const t = useTranslations(texts);

  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}`)
      .then((data) => setActivity(data.activity))
      .catch(() => navigate('/admin/dashboard'));
  }, [id, navigate]);

  const playUrl = activity ? `${window.location.origin}/play/${activity.code}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(playUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await adminApiFetch(`/api/admin/activities/${id}`, { method: 'DELETE' });
    navigate('/admin/dashboard');
  };

  const handleStatusToggle = async () => {
    if (!activity) return;
    const newStatus = activity.status === 'preview' ? 'live' : 'preview';
    if (newStatus === 'live') { setShowGoLiveModal(true); return; }
    setTogglingStatus(true);
    try {
      const data = await adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: newStatus }),
      });
      setActivity(data.activity);
    } catch { /* ignore */ }
    setTogglingStatus(false);
  };

  const confirmGoLive = async () => {
    setShowGoLiveModal(false);
    setTogglingStatus(true);
    try {
      const data = await adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'live' }),
      });
      setActivity(data.activity);
    } catch { /* ignore */ }
    setTogglingStatus(false);
  };

  if (!activity) return null;

  const fieldLabels: Record<string, string> = { name: t.fieldName, email: t.email, phoneNumber: t.phone };

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <OutlineButton onClick={() => navigate('/admin/dashboard')}>{t.back}</OutlineButton>
      </AdminHeader>
      <AdminContent style={{ display: 'flex', justifyContent: 'center' }}>
        <ViewCard>
          {/* Header */}
          <HeaderSection>
            <HeaderLeft>
              <ActivityName>{activity.name}</ActivityName>
              <HeaderMeta>
                <CodeBadge>{activity.code}</CodeBadge>
                <DateText>{new Date(activity.createdAt).toLocaleDateString()}</DateText>
              </HeaderMeta>
            </HeaderLeft>
            <HeaderRight>
              <StatusRow>
                <StatusBadge status={activity.status}>
                  {activity.status === 'live' ? t.live : t.preview}
                </StatusBadge>
                <StatusToggle onClick={handleStatusToggle} disabled={togglingStatus}>
                  {activity.status === 'preview' ? t.goLive : t.goPreview}
                </StatusToggle>
              </StatusRow>
            </HeaderRight>
          </HeaderSection>

          {/* Body */}
          <BodySection>
            <InfoGrid>
              <InfoCard>
                <InfoLabel>{t.loginFields}</InfoLabel>
                <InfoValue>
                  {activity.loginFields.map((f) => (
                    <Badge key={f}>{fieldLabels[f] || f}</Badge>
                  ))}
                  {activity.emailGoogle && <Badge>{t.google}</Badge>}
                </InfoValue>
              </InfoCard>

              <InfoCard>
                <InfoLabel>{t.connectionType}</InfoLabel>
                <InfoValue>
                  <Badge>{activity.connectionType}</Badge>
                  {activity.connectionType === 'group' && activity.groups.length > 0 && (
                    <>
                      {activity.groups.map((g) => <Badge key={g.name} style={{ background: '#e8f5e9', color: '#2e7d32' }}>{g.name}</Badge>)}
                    </>
                  )}
                </InfoValue>
              </InfoCard>

              <InfoCard>
                <InfoLabel>{t.module}</InfoLabel>
                <InfoValue>
                  <Badge>{activity.module ? activity.module.type : t.noModule}</Badge>
                </InfoValue>
              </InfoCard>

              {activity.module?.backgroundImage && (
                <InfoCard>
                  <InfoLabel>{t.background}</InfoLabel>
                  <InfoValue>
                    <code style={{ fontSize: 12, wordBreak: 'break-all', color: '#666' }}>{activity.module.backgroundImage}</code>
                  </InfoValue>
                </InfoCard>
              )}
            </InfoGrid>

            {/* Module items */}
            {activity.module && activity.module.items.length > 0 && (
              <ItemsSection>
                <ItemsSectionTitle>{t.items} ({activity.module.items.length})</ItemsSectionTitle>
                <ItemsList>
                  {activity.module.items.map((item, i) => {
                    const icon = item.type === 'game'
                      ? (GAME_ICONS[item.data?.type || ''] || '🎮')
                      : (STATION_ICONS[item.data?.type || ''] || '📍');
                    return (
                      <ItemRow key={item.data?._id || item.ref || i}>
                        <ItemIndex>{i + 1}</ItemIndex>
                        <span style={{ fontSize: 16 }}>{icon}</span>
                        <ItemName>{item.data?.name || '?'}</ItemName>
                        <ItemTypePill itemType={item.type}>
                          {item.data?.type || item.type}
                        </ItemTypePill>
                      </ItemRow>
                    );
                  })}
                </ItemsList>
              </ItemsSection>
            )}

            {/* Play link */}
            <LinkSection>
              <LinkLabel>{t.playLink}</LinkLabel>
              <LinkRow>
                <LinkUrl>{playUrl}</LinkUrl>
                <CopyButton onClick={handleCopy}>{copied ? t.copied : t.copy}</CopyButton>
              </LinkRow>
            </LinkSection>
          </BodySection>

          {/* Footer */}
          <FooterSection>
            <EditButton onClick={() => navigate(`/admin/activities/${id}/edit`)}>
              {t.edit}
            </EditButton>
            <DangerButton confirm={confirmDelete} onClick={handleDelete}>
              {confirmDelete ? t.confirmDelete : t.delete}
            </DangerButton>
          </FooterSection>
        </ViewCard>
      </AdminContent>

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
    </AdminPage>
  );
}
