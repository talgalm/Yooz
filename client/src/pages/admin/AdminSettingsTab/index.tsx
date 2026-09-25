import { styled } from '@mui/material/styles';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { LANGS, useLang, useTranslations } from '../../../context/LanguageContext';
import type { Lang } from '../../../context/LanguageContext';
import { texts } from './AdminSettingsTab.i18n';
import { storeLang } from '../../../utils/currentLang';
import { AdminCard, SelectionButton, DangerButton } from '../../../components/styled';
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

  const pickLang = (next: Lang) => {
    if (next === lang) return;
    storeLang(next);
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
          {LANGS.map((l) => (
            <LangButton key={l.code} type="button" selected={lang === l.code} onClick={() => pickLang(l.code)}>
              {l.flag} {l.label}
            </LangButton>
          ))}
        </LangRow>
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
