import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useLang, useTranslations } from '../../../context/LanguageContext';
import type { Lang } from '../../../context/LanguageContext';
import { texts } from './AdminSettingsTab.i18n';
import { AdminCard, SelectionButton, DangerButton, PrimaryButton } from '../../../components/styled';
import { SectionTitle, SmallMutedText, DetailRow, DetailLabel, RoleBadge } from '../styled';

const Stack = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  maxWidth: 720,
});

const CardHead = styled('div')({
  marginBottom: 12,
});

const Identity = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 8,
});

const Avatar = styled('div')({
  width: 46,
  height: 46,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
});

const IdentityName = styled('div')({
  fontSize: 16,
  fontWeight: 700,
  color: '#241f38',
});

const LangRow = styled('div')({
  display: 'flex',
  gap: 10,
  '@media (max-width: 600px)': {
    flexDirection: 'column',
  },
});

const LangButton = styled(SelectionButton)({
  flex: 1,
  padding: '14px 18px',
  fontSize: 15,
});

const DetailValueText = styled('div')({
  color: '#5c5670',
  fontSize: 14,
  wordBreak: 'break-all',
});

export default function AdminSettingsTab({ onLogout }: { onLogout: () => void }) {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  const role = admin?.role || 'viewer';
  const roleLabel = {
    viewer: t.roleViewer,
    admin: t.roleAdmin,
    super_admin: t.roleSuperAdmin,
    customer: t.roleCustomer,
  }[role];

  const displayName = admin?.name || admin?.email || '';
  const initials = displayName.trim().charAt(0).toUpperCase() || '?';

  // Matches LangDrawer: the language is read from storage at boot, so the
  // switch has to persist and reload rather than just set context state.
  const pickLang = (next: Lang) => {
    if (next === lang) return;
    localStorage.setItem('yooz_lang', next);
    window.location.reload();
  };

  return (
    <Stack>
      <AdminCard>
        <CardHead>
          <SectionTitle>{t.account}</SectionTitle>
          <SmallMutedText>{t.accountDesc}</SmallMutedText>
        </CardHead>

        <Identity>
          <Avatar>{initials}</Avatar>
          <div>
            <IdentityName>{admin?.name || t.noName}</IdentityName>
            <RoleBadge role={role}>{roleLabel}</RoleBadge>
          </div>
        </Identity>

        <DetailRow>
          <DetailLabel>{t.email}</DetailLabel>
          <DetailValueText>{admin?.email || '—'}</DetailValueText>
        </DetailRow>
        <DetailRow style={{ borderBottom: 'none' }}>
          <DetailLabel>{t.role}</DetailLabel>
          <DetailValueText>{roleLabel}</DetailValueText>
        </DetailRow>
      </AdminCard>

      <AdminCard>
        <CardHead>
          <SectionTitle>{t.language}</SectionTitle>
          <SmallMutedText>{t.languageDesc}</SmallMutedText>
        </CardHead>

        <LangRow>
          <LangButton type="button" selected={lang === 'he'} onClick={() => pickLang('he')}>
            🇮🇱 {t.hebrew}
          </LangButton>
          <LangButton type="button" selected={lang === 'en'} onClick={() => pickLang('en')}>
            🇺🇸 {t.english}
          </LangButton>
        </LangRow>
      </AdminCard>

      <AdminCard>
        <CardHead>
          <SectionTitle>{t.clients}</SectionTitle>
          <SmallMutedText>{t.clientsDesc}</SmallMutedText>
        </CardHead>
        {/* /manage is its own auth realm — this only opens it, it does not sign you in. */}
        <PrimaryButton type="button" style={{ width: 'auto', padding: '12px 28px', fontSize: 16 }} onClick={() => navigate('/manage')}>
          {t.clientsOpen}
        </PrimaryButton>
      </AdminCard>

      <AdminCard>
        <CardHead>
          <SectionTitle>{t.session}</SectionTitle>
          <SmallMutedText>{t.sessionDesc}</SmallMutedText>
        </CardHead>
        <DangerButton type="button" onClick={onLogout}>
          {t.logout}
        </DangerButton>
      </AdminCard>
    </Stack>
  );
}
