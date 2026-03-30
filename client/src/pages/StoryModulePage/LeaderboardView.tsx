import React from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
import LangDrawer from '../../components/LangDrawer';
import { styled, keyframes } from '@mui/material/styles';
import { HeaderBar, HeaderActions, AccentText } from '../../components/styled';
import type { LeaderboardEntry } from './types';

// ─── Colors ───

const C_BG_TOP = '#5c1a9e';
const C_BG_BOT = '#1e0050';
const C_GOLD_HEX = '#f5b731';
const C_GOLD_HEX_DARK = '#c88a10';
const C_WHITE_HEX = '#ffffff';

// ─── Animations ───

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.8; transform: scale(1.4); }
`;

// ─── Styled Components ───

const PageRoot = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: `linear-gradient(180deg, ${C_BG_TOP} 0%, ${C_BG_BOT} 100%)`,
});

/** Sparkle dots scattered in the background */
function SparklesBg() {
  const dots = [
    { x: '12%', y: '8%',  s: 3, d: 0 },
    { x: '88%', y: '12%', s: 2, d: 0.4 },
    { x: '6%',  y: '30%', s: 4, d: 0.8 },
    { x: '92%', y: '28%', s: 2, d: 1.2 },
    { x: '18%', y: '55%', s: 3, d: 0.6 },
    { x: '82%', y: '52%', s: 2, d: 1.0 },
    { x: '50%', y: '18%', s: 2, d: 0.3 },
    { x: '35%', y: '75%', s: 3, d: 0.9 },
    { x: '70%', y: '80%', s: 2, d: 0.2 },
    { x: '25%', y: '92%', s: 2, d: 1.4 },
    { x: '78%', y: '90%', s: 3, d: 0.7 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: dot.s,
            height: dot.s,
            borderRadius: '50%',
            background: '#fff',
            animation: `${sparkle} ${2 + dot.d}s ease-in-out ${dot.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

const Content = styled('div')({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
});

const PageTitle = styled('h1')({
  color: '#fff',
  fontSize: 26,
  fontWeight: 900,
  textAlign: 'center',
  margin: '8px 0 16px',
  letterSpacing: 1,
  textShadow: '0 2px 12px rgba(0,0,0,0.4)',
  animation: `${fadeUp} 0.4s ease-out both`,
});

const MainScroll = styled('div')({
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0 16px 8px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
});

const PlayerList = styled('div')({
  width: '100%',
  maxWidth: 420,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '4px 2px',
});

const PlayerCard = styled('div')<{ highlighted?: boolean; animDelay?: number }>(
  ({ highlighted, animDelay = 0 }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: highlighted
      ? 'rgba(255,255,255,0.18)'
      : 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    border: highlighted
      ? '1.5px solid rgba(255,255,255,0.5)'
      : '1.5px solid rgba(255,255,255,0.15)',
    boxShadow: highlighted
      ? '0 4px 20px rgba(255,255,255,0.1)'
      : '0 2px 8px rgba(0,0,0,0.2)',
    animation: `${fadeUp} 0.35s ease-out ${0.1 + animDelay * 0.055}s both`,
    direction: 'rtl',
  }),
);

/** Hexagon clip-path badge */
const HexBadge = styled('div')<{ gold?: boolean }>(({ gold }) => ({
  flexShrink: 0,
  width: 38,
  height: 38,
  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  background: gold
    ? `linear-gradient(160deg, ${C_GOLD_HEX} 0%, ${C_GOLD_HEX_DARK} 100%)`
    : `linear-gradient(160deg, ${C_WHITE_HEX} 0%, #d0d0d0 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 900,
  color: gold ? '#5a3a00' : '#444',
  boxShadow: gold
    ? '0 2px 8px rgba(245,183,49,0.5)'
    : '0 2px 6px rgba(0,0,0,0.2)',
}));

const PlayerName = styled('div')({
  flex: 1,
  minWidth: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'right',
});

const ScoreValue = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1,
  flexShrink: 0,
  minWidth: 44,
  textAlign: 'left',
});

const BackFooter = styled('div')({
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '12px 16px calc(16px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
});

const BackButton = styled('button')({
  padding: '12px 48px',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: '2px solid rgba(255,255,255,0.35)',
  borderRadius: 50,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  transition: 'background 0.15s',
  '&:hover': { background: 'rgba(255,255,255,0.25)' },
  '&:active': { background: 'rgba(255,255,255,0.3)' },
});

const LoadingText = styled('p')({
  color: 'rgba(255,255,255,0.7)',
  marginTop: 40,
  fontSize: 15,
  textAlign: 'center',
});

const EmptyText = styled('p')({
  color: 'rgba(255,255,255,0.6)',
  marginTop: 40,
  fontSize: 15,
  textAlign: 'center',
});

// ─── Helpers ───

/** Truncates to at most one decimal (e.g. 315.65999999 → 315.6). */
function formatLeaderboardScore(score: number): string {
  const n = typeof score === 'number' && !Number.isNaN(score) ? score : Number(score);
  if (!Number.isFinite(n)) return '0';
  const scaled = n * 10;
  const eps = 1e-9;
  const t = (scaled >= 0 ? Math.floor(scaled + eps) : Math.ceil(scaled - eps)) / 10;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
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
    <PageRoot>
      <SparklesBg />

      {/* Header */}
      <HeaderBar
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          background: 'rgba(0,0,0,0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <AccentText style={{ color: '#fff' }}>{activityName}</AccentText>
        <HeaderActions>
          <HelpChatHeaderButton />
          <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
          <LangDrawer variant="darkHeader" />
        </HeaderActions>
      </HeaderBar>

      <Content>
        <MainScroll>
          <PageTitle>{t.leaderboardTitle}</PageTitle>

          {isLoading ? (
            <LoadingText>{t.leaderboardLoading}</LoadingText>
          ) : leaderboard.length === 0 ? (
            <EmptyText>{t.leaderboardEmpty}</EmptyText>
          ) : (
            <PlayerList>
              {leaderboard.map((entry, i) => {
                const isMe = currentParticipantName === entry.name;
                const isTop3 = entry.rank <= 3;
                return (
                  <PlayerCard
                    key={`${entry.rank}-${entry.name}`}
                    highlighted={isMe}
                    animDelay={i}
                  >
                    {/* Rank badge — right side in RTL */}
                    <HexBadge gold={isTop3}>{entry.rank}</HexBadge>

                    {/* Name — center */}
                    <PlayerName>{entry.name}</PlayerName>

                    {/* Score — left side in RTL */}
                    <ScoreValue>{formatLeaderboardScore(entry.score)}</ScoreValue>
                  </PlayerCard>
                );
              })}
            </PlayerList>
          )}
        </MainScroll>

        <BackFooter>
          <BackButton type="button" onClick={onBack}>
            {t.leaderboardBack}
          </BackButton>
        </BackFooter>
      </Content>
    </PageRoot>
  );
}
