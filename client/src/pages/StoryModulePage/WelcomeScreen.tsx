import React from 'react';
import LangDrawer from '../../components/LangDrawer';
import { styled } from '@mui/material/styles';
import {
  PageContainer,
  HeaderBar,
  HeaderActions,
  AccentText,
  OutlineButton,
  CenteredContent,
  Title,
  BodyText,
  PrimaryButton,
} from '../../components/styled';

const WelcomeButton = styled(PrimaryButton)({
  maxWidth: 240,
});

interface WelcomeScreenProps {
  activityName: string;
  participantName?: string;
  itemCount: number;
  bgStyle: React.CSSProperties;
  onStart: () => void;
  onLogout: () => void;
  popupModal: React.ReactNode;
  t: Record<string, string>;
}

export default function WelcomeScreen({
  activityName,
  participantName,
  itemCount,
  bgStyle,
  onStart,
  onLogout,
  popupModal,
  t,
}: WelcomeScreenProps) {
  return (
    <PageContainer style={bgStyle}>
      <HeaderBar>
        <AccentText>{activityName}</AccentText>
        <HeaderActions>
          <LangDrawer />
          <OutlineButton onClick={onLogout}>X</OutlineButton>
        </HeaderActions>
      </HeaderBar>
      <CenteredContent>
        <Title>{t.welcome}</Title>
        {participantName && (
          <BodyText sx={{ marginBottom: '8px', fontWeight: 600, fontSize: 20 }}>
            {participantName}
          </BodyText>
        )}
        <BodyText sx={{ marginBottom: '32px' }}>
          {itemCount} {t.step}{itemCount !== 1 ? 's' : ''}
        </BodyText>
        <WelcomeButton onClick={onStart}>
          {t.startButton}
        </WelcomeButton>
      </CenteredContent>
      {popupModal}
    </PageContainer>
  );
}
