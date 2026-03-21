import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './HomePage.i18n';
import LangDrawer from '../../components/LangDrawer';
import {
  PageContainer,
  HeaderBar,
  HeaderActions,
  AccentText,
  OutlineButton,
  CenteredContent,
  Title,
  BodyText,
} from '../../components/styled';
import { GroupText } from '../admin/styled';

export default function HomePage() {
  const { participant, logout } = useAuth();
  const t = useTranslations(texts);
  const navigate = useNavigate();

  const handleLogout = () => {
    const loginPath = participant?.activityCode ? `/play/${participant.activityCode}` : '/';
    navigate(loginPath, { replace: true });
    logout();
  };

  return (
    <PageContainer>
      <HeaderBar>
        <AccentText>{participant?.activityCode}</AccentText>
        <HeaderActions>
          <LangDrawer />
          <OutlineButton onClick={handleLogout}>{t.leave}</OutlineButton>
        </HeaderActions>
      </HeaderBar>
      <CenteredContent>
        <Title>{t.hey}, {participant?.name}!</Title>
        {participant?.group && (
          <GroupText>{participant.group}</GroupText>
        )}
        <BodyText>{t.welcomeMessage}</BodyText>
      </CenteredContent>
    </PageContainer>
  );
}
