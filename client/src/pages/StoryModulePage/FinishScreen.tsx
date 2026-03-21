import React, { useState } from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import LangDrawer from '../../components/LangDrawer';
import NatureBackground from '../../components/NatureBackground';
import { styled, keyframes } from '@mui/material/styles';
import { HeaderBar, HeaderActions, AccentText } from '../../components/styled';
import type { ConfettiPiece } from './types';

// ─── Colors ───

const C_PRIMARY_BG = '#8bc34a';
const C_DARK_GREEN = '#689f38';
const C_DARKER_GREEN = '#33691e';
const C_YELLOW_STAR = '#ffca28';
const C_LIGHT_GREEN = '#c5e1a5';

// ─── Animations ───

const badgePop = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  80% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
`;

const statSlideUp = keyframes`
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const ribbonSlide = keyframes`
  0% { transform: scaleX(0); opacity: 0; }
  100% { transform: scaleX(1); opacity: 1; }
`;

const buttonPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`;

const confettiFall = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
`;

// ─── Confetti ───

const CONFETTI_COLORS = ['#ffca28', '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da', '#ffa726', '#ec407a'];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

const ConfettiContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 100,
  overflow: 'hidden',
});

const ConfettiPieceStyled = styled('div')<{
  x: number;
  pieceSize: number;
  color: string;
  rotation: number;
  duration: number;
  delay: number;
}>(({ x, pieceSize, color, rotation, duration, delay }) => ({
  position: 'absolute',
  left: `${x}%`,
  top: -20,
  width: pieceSize,
  height: pieceSize * 0.6,
  background: color,
  borderRadius: 2,
  opacity: 0.9,
  transform: `rotate(${rotation}deg)`,
  animation: `${confettiFall} ${duration}s ease-in ${delay}s both`,
}));

function ConfettiOverlay() {
  const [pieces] = useState(() => generateConfetti(60));

  return (
    <ConfettiContainer>
      {pieces.map((p) => (
        <ConfettiPieceStyled
          key={p.id}
          x={p.x}
          pieceSize={p.size}
          color={p.color}
          rotation={p.rotation}
          duration={p.duration}
          delay={p.delay}
        />
      ))}
    </ConfettiContainer>
  );
}

// ─── Styled Components ───

const Content = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
  textAlign: 'center',
});

const RibbonTitle = styled('div')({
  position: 'relative',
  background: C_DARK_GREEN,
  color: '#fff',
  fontSize: 18,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 2,
  padding: '12px 36px',
  borderRadius: 4,
  textAlign: 'center',
  marginBottom: 28,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  animation: `${ribbonSlide} 0.5s ease-out 0.2s both`,
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  '&::before': {
    left: -12,
    borderWidth: '16px 12px 16px 0',
    borderColor: `transparent ${C_DARK_GREEN} transparent transparent`,
  },
  '&::after': {
    right: -12,
    borderWidth: '16px 0 16px 12px',
    borderColor: `transparent transparent transparent ${C_DARK_GREEN}`,
  },
});

const Badge = styled('div')({
  width: 120,
  height: 120,
  borderRadius: '50%',
  background: C_YELLOW_STAR,
  border: `4px solid ${C_DARKER_GREEN}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24,
  boxShadow: `0 6px 20px rgba(0,0,0,0.25), inset 0 -3px 8px rgba(0,0,0,0.15)`,
  animation: `${badgePop} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both`,
});

const ScoreInBadge = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const ScoreNumber = styled('div')({
  fontSize: 36,
  fontWeight: 900,
  color: C_DARKER_GREEN,
  lineHeight: 1,
});

const ScoreLabel = styled('div')({
  fontSize: 11,
  fontWeight: 700,
  color: C_DARKER_GREEN,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginTop: 2,
});

const StatCardsRow = styled('div')({
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
  marginBottom: 28,
  width: '100%',
  maxWidth: 340,
});

const StatCard = styled('div')<{ delay?: number }>(({ delay = 0 }) => ({
  flex: 1,
  background: 'rgba(255,255,255,0.92)',
  borderRadius: 16,
  padding: '14px 8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  animation: `${statSlideUp} 0.4s ease-out ${0.6 + delay * 0.15}s both`,
}));

const StatIcon = styled('div')({
  fontSize: 24,
  lineHeight: 1,
  marginBottom: 2,
});

const StatValue = styled('div')({
  fontSize: 20,
  fontWeight: 800,
  color: C_DARKER_GREEN,
  lineHeight: 1,
});

const StatLabel = styled('div')({
  fontSize: 10,
  fontWeight: 600,
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const ActionsColumn = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  width: '100%',
  maxWidth: 280,
  animation: `${statSlideUp} 0.4s ease-out 1.1s both`,
});

const ContinueButton = styled('button')({
  width: '100%',
  padding: '15px 28px',
  background: C_DARK_GREEN,
  color: '#fff',
  border: 'none',
  borderRadius: 50,
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  boxShadow: `0 5px 0 ${C_DARKER_GREEN}, 0 8px 20px rgba(0,0,0,0.2)`,
  transition: 'transform 0.1s, box-shadow 0.1s',
  animation: `${buttonPulse} 2s ease-in-out 2s infinite`,
  '&:active': {
    transform: 'translateY(5px)',
    boxShadow: `0 0 0 ${C_DARKER_GREEN}, 0 2px 8px rgba(0,0,0,0.2)`,
  },
});

const SecondaryButton = styled('button')({
  width: '100%',
  padding: '12px 24px',
  background: 'rgba(255,255,255,0.85)',
  color: C_DARKER_GREEN,
  border: `2px solid ${C_LIGHT_GREEN}`,
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:hover': {
    background: 'rgba(255,255,255,1)',
  },
});

const ExitButton = styled('button')({
  width: '100%',
  padding: '12px 24px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.75)',
  border: '2px solid rgba(255,255,255,0.35)',
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'color 0.15s, border-color 0.15s',
  '&:hover': {
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.6)',
  },
});

const Countdown = styled('div')({
  marginTop: 20,
  fontSize: 12,
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 500,
});

// ─── SVG Icons ───

function CheckmarkIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <path
        d="M14 24l8 8 14-16"
        fill="none"
        stroke={C_DARKER_GREEN}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <path d="M16 8h16v14c0 4.4-3.6 8-8 8s-8-3.6-8-8V8z" fill={C_YELLOW_STAR} stroke={C_DARKER_GREEN} strokeWidth="2" />
      <path d="M16 12H8c0 6 4 10 8 10" fill="none" stroke={C_DARKER_GREEN} strokeWidth="2" />
      <path d="M32 12h8c0 6-4 10-8 10" fill="none" stroke={C_DARKER_GREEN} strokeWidth="2" />
      <rect x="20" y="30" width="8" height="6" rx="1" fill={C_DARKER_GREEN} />
      <rect x="16" y="36" width="16" height="4" rx="2" fill={C_DARKER_GREEN} />
    </svg>
  );
}

// ─── Component ───

interface FinishScreenProps {
  activityName: string;
  totalScore: number;
  hasScores: boolean;
  itemCount: number;
  completedItems: number;
  countdown: number;
  countdownSeconds: number;
  bgStyle: React.CSSProperties;
  onStay: () => void;
  onViewLeaderboard: () => void;
  onExit: () => void;
  popupModal: React.ReactNode;
  t: Record<string, string>;
}

export default function FinishScreen({
  activityName,
  totalScore,
  hasScores,
  itemCount,
  completedItems,
  countdown,
  onStay,
  onViewLeaderboard,
  onExit,
  popupModal,
  t,
}: FinishScreenProps) {
  return (
    <NatureBackground>
      <ConfettiOverlay />
      <HeaderBar style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <AccentText style={{ color: '#fff' }}>{activityName}</AccentText>
        <HeaderActions>
          <ActivityLogoutButton onClick={onExit} ariaLabel={t.exitActivity} />
          <LangDrawer />
        </HeaderActions>
      </HeaderBar>

      <Content>
        <RibbonTitle>{t.finishTitle}</RibbonTitle>

        {hasScores ? (
          <Badge>
            <ScoreInBadge>
              <ScoreNumber>{totalScore}</ScoreNumber>
              <ScoreLabel>{t.finishStars}</ScoreLabel>
            </ScoreInBadge>
          </Badge>
        ) : (
          <Badge>
            <CheckmarkIcon />
          </Badge>
        )}

        <StatCardsRow>
          <StatCard delay={0}>
            <StatIcon>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={C_DARK_GREEN}>
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
            </StatIcon>
            <StatValue>{completedItems}/{itemCount}</StatValue>
            <StatLabel>{t.finishItems}</StatLabel>
          </StatCard>

          {hasScores && (
            <StatCard delay={1}>
              <StatIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={C_YELLOW_STAR}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </StatIcon>
              <StatValue>{totalScore}</StatValue>
              <StatLabel>{t.finishStars}</StatLabel>
            </StatCard>
          )}

          <StatCard delay={2}>
            <StatIcon>
              <TrophyIcon />
            </StatIcon>
            <StatValue style={{ fontSize: 16 }}>{t.finishComplete}</StatValue>
            <StatLabel>{t.finishStatus}</StatLabel>
          </StatCard>
        </StatCardsRow>

        <ActionsColumn>
          <ContinueButton onClick={onViewLeaderboard}>
            {t.viewLeaderboard}
          </ContinueButton>
          <SecondaryButton onClick={onStay}>
            {t.stayHere}
          </SecondaryButton>
          <ExitButton onClick={onExit}>
            {t.exitActivity}
          </ExitButton>
        </ActionsColumn>

        <Countdown>
          {t.autoExitIn} {countdown}{t.seconds}
        </Countdown>
      </Content>
      {popupModal}
    </NatureBackground>
  );
}
