import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rememberParticipantActivity } from '../../utils/participantActivity';
import { useParticipantExit } from '../../hooks/useParticipantExit';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './HomePage.i18n';
import LangDrawer from '../../components/LangDrawer';
import { HelpChatHeaderButton } from '../../components/HelpChat';
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
  const { participant } = useAuth();
  const t = useTranslations(texts);
  const exitActivity = useParticipantExit();

  useEffect(() => {
    rememberParticipantActivity(participant?.activityCode);
  }, [participant?.activityCode]);

  return (
    <PageContainer>
      <HeaderBar>
        <AccentText>{participant?.activityCode}</AccentText>
        <HeaderActions>
          <LangDrawer />
          <HelpChatHeaderButton tone="light" />
          <OutlineButton onClick={() => exitActivity(participant?.activityCode)}>{t.leave}</OutlineButton>
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
