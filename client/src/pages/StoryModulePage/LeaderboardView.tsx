import React from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import LangDrawer from '../../components/LangDrawer';
import NatureBackground from '../../components/NatureBackground';
import { styled, keyframes } from '@mui/material/styles';
import { HeaderBar, HeaderActions, AccentText, BodyText } from '../../components/styled';
import type { LeaderboardEntry } from './types';

// ─── Colors ───

const C_DARK_GREEN = '#689f38';
const C_DARKER_GREEN = '#33691e';
const C_YELLOW_STAR = '#6c5ce7';
const C_GOLD = '#ffd700';
const C_SILVER = '#c0c0c0';
const C_BRONZE = '#cd7f32';
const C_LIGHT_GREEN = '#c5e1a5';

// ─── Animations ───

const ribbonSlide = keyframes`
  0% { transform: scaleX(0); opacity: 0; }
  100% { transform: scaleX(1); opacity: 1; }
`;

const cardSlideIn = keyframes`
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`;

// ─── Styled Components ───

const Content = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 16px 24px',
});

const RibbonTitle = styled('div')({
  position: 'relative',
  background: C_DARK_GREEN,
  color: '#fff',
  fontSize: 16,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 2,
  padding: '10px 32px',
  borderRadius: 4,
  textAlign: 'center',
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  animation: `${ribbonSlide} 0.5s ease-out 0.1s both`,
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
    left: -10,
    borderWidth: '14px 10px 14px 0',
    borderColor: `transparent ${C_DARK_GREEN} transparent transparent`,
  },
  '&::after': {
    right: -10,
    borderWidth: '14px 0 14px 10px',
    borderColor: `transparent transparent transparent ${C_DARK_GREEN}`,
  },
});

const PlayerList = styled('div')({
  width: '100%',
  maxWidth: 380,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 'calc(100dvh - 220px)',
  overflowY: 'auto',
  padding: '4px 2px',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
  },
});

const PlayerCard = styled('div')<{ highlighted?: boolean; animDelay?: number }>(
  ({ highlighted, animDelay = 0 }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: highlighted ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    border: highlighted ? `3px solid ${C_YELLOW_STAR}` : '3px solid transparent',
    boxShadow: highlighted
      ? `0 4px 16px rgba(255,202,40,0.35), 0 2px 8px rgba(0,0,0,0.1)`
      : '0 2px 8px rgba(0,0,0,0.1)',
    animation: `${cardSlideIn} 0.3s ease-out ${0.15 + animDelay * 0.06}s both`,
    transition: 'transform 0.15s',
  }),
);

const RankBadge = styled('div')<{ medalColor?: string }>(({ medalColor }) => ({
  width: 35,
  height: 35,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  fontSize: medalColor ? 18 : 14,
  flexShrink: 0,
  ...(medalColor
    ? {
        background: medalColor,
        color: '#fff',
        boxShadow: `0 2px 6px ${medalColor}66`,
        border: `2px solid ${medalColor === C_GOLD ? '#e6c200' : medalColor === C_SILVER ? '#a8a8a8' : '#b06a2a'}`,
      }
    : {
        background: C_LIGHT_GREEN,
        color: C_DARKER_GREEN,
        border: `2px solid ${C_DARK_GREEN}33`,
      }),
}));

const AvatarCircle = styled('div')<{ bgColor: string }>(({ bgColor }) => ({
  width: 35,
  height: 35,
  borderRadius: '50%',
  background: bgColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 14,
  color: '#fff',
  flexShrink: 0,
  textTransform: 'uppercase',
  border: '2px solid rgba(255,255,255,0.8)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
}));

const PlayerInfo = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});

const PlayerName = styled('div')({
  fontSize: 15,
  fontWeight: 700,
  color: C_DARKER_GREEN,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const PlayerGroup = styled('span')({
  fontSize: 11,
  color: '#999',
  fontWeight: 500,
});

const ScoreSection = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 1,
  flexShrink: 0,
});

const ScoreValue = styled('div')({
  fontSize: 18,
  fontWeight: 900,
  color: C_DARKER_GREEN,
  lineHeight: 1,
});

const ScoreLabel = styled('div')({
  fontSize: 9,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const BackButton = styled('button')({
  marginTop: 16,
  padding: '12px 36px',
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

const LoadingText = styled(BodyText)({
  color: 'rgba(255,255,255,0.8)',
  marginTop: 40,
});

const EmptyText = styled(BodyText)({
  color: 'rgba(255,255,255,0.7)',
  marginTop: 40,
  fontSize: 15,
});

// ─── Helpers ───

const AVATAR_COLORS = ['#66bb6a', '#42a5f5', '#ab47bc', '#ff7043', '#26c6da', '#ec407a', '#ffa726', '#5c6bc0'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]);
  }
  return name.slice(0, 2);
}

function getMedalColor(rank: number): string | undefined {
  if (rank === 1) return C_GOLD;
  if (rank === 2) return C_SILVER;
  if (rank === 3) return C_BRONZE;
  return undefined;
}

function MedalIcon({ rank }: { rank: number }) {
  const medalColor = getMedalColor(rank);
  if (!medalColor) return null;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={C_YELLOW_STAR} style={{ marginBottom: -2 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ─── Component ───

interface LeaderboardViewProps {
  activityName: string;
  leaderboard: LeaderboardEntry[];
  currentParticipantName?: string;
  isLoading: boolean;
  bgStyle: React.CSSProperties;
  onBack: () => void;
  onLogout: () => void;
  t: Record<string, string>;
}

export default function LeaderboardView({
  activityName,
  leaderboard,
  currentParticipantName,
  isLoading,
  onBack,
  onLogout,
  t,
}: LeaderboardViewProps) {
  return (
    <NatureBackground>
      <HeaderBar style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <AccentText style={{ color: '#fff' }}>{activityName}</AccentText>
        <HeaderActions>
          <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
          <LangDrawer />
        </HeaderActions>
      </HeaderBar>

      <Content>
        <RibbonTitle>{t.leaderboardTitle}</RibbonTitle>

        {isLoading ? (
          <LoadingText>{t.leaderboardLoading}</LoadingText>
        ) : leaderboard.length === 0 ? (
          <EmptyText>{t.leaderboardEmpty}</EmptyText>
        ) : (
          <PlayerList>
            {leaderboard.map((entry, i) => {
              const isMe = currentParticipantName === entry.name;
              const medalColor = getMedalColor(entry.rank);
              return (
                <PlayerCard
                  key={`${entry.rank}-${entry.name}`}
                  highlighted={isMe}
                  animDelay={i}
                >
                  <RankBadge medalColor={medalColor}>
                    {medalColor ? <MedalIcon rank={entry.rank} /> : entry.rank}
                  </RankBadge>

                  <AvatarCircle bgColor={getAvatarColor(entry.name)}>
                    {getInitials(entry.name)}
                  </AvatarCircle>

                  <PlayerInfo>
                    <PlayerName>{entry.name}</PlayerName>
                    {entry.group && <PlayerGroup>{entry.group}</PlayerGroup>}
                  </PlayerInfo>

                  <ScoreSection>
                    <ScoreValue>{entry.score}</ScoreValue>
                    <ScoreLabel>{t.finishStars || 'Points'}</ScoreLabel>
                  </ScoreSection>
                </PlayerCard>
              );
            })}
          </PlayerList>
        )}

        <BackButton onClick={onBack}>
          {t.leaderboardBack}
        </BackButton>
      </Content>
    </NatureBackground>
  );
}
