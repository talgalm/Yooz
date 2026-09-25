import React from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
import LangDrawer from '../../components/LangDrawer';
import { styled, keyframes } from '@mui/material/styles';
import { HeaderBar, HeaderActions, AccentText } from '../../components/styled';
import type { LeaderboardEntry, GroupLeaderboardEntry } from './types';

const C_BG_TOP = '#5c1a9e';
const C_BG_BOT = '#1e0050';
const C_GOLD_HEX = '#f5b731';
const C_GOLD_HEX_DARK = '#c88a10';
const C_WHITE_HEX = '#ffffff';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.8; transform: scale(1.4); }
`;

const PageRoot = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: `linear-gradient(180deg, ${C_BG_TOP} 0%, ${C_BG_BOT} 100%)`,
});

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

const SectionTitle = styled('h2')({
  width: '100%',
  maxWidth: 420,
  color: 'rgba(255,255,255,0.85)',
  fontSize: 16,
  fontWeight: 800,
  textAlign: 'center',
  margin: '0 0 10px',
  animation: `${fadeUp} 0.35s ease-out both`,
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
  }),
);

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

const PlayerName = styled('div')<{ me?: boolean }>(({ me }) => ({
  flex: 1,
  minWidth: 0,
  fontSize: 15,
  fontWeight: me ? 900 : 600,
  color: me ? '#fff' : 'rgba(255,255,255,0.82)',
  textShadow: me ? '0 0 10px rgba(255,255,255,0.35)' : 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'start',
}));

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

function formatLeaderboardScore(score: number): string {
  const n = typeof score === 'number' && !Number.isNaN(score) ? score : Number(score);
  if (!Number.isFinite(n)) return '0';
  const scaled = n * 10;
  const eps = 1e-9;
  const t = (scaled >= 0 ? Math.floor(scaled + eps) : Math.ceil(scaled - eps)) / 10;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
}

function formatScore(score: number, asGrade: boolean): string {
  return asGrade ? `${Math.round(score)}` : formatLeaderboardScore(score);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface LeaderboardViewProps {
  languages?: string[];
  activityName: string;
  leaderboard: LeaderboardEntry[];
  groupLeaderboard?: GroupLeaderboardEntry[];
  currentGroup?: string;
  currentParticipantName?: string;
  isLoading: boolean;
  bgStyle: React.CSSProperties;
  leaderboardMode?: 'points' | 'time' | 'both';
  leaderboardAsGrade?: boolean;
  showAllGroups?: boolean;
  onBack: () => void;
  onLogout: () => void;
  t: Record<string, string>;
}

export default function LeaderboardView({
  languages,
  activityName,
  leaderboard,
  groupLeaderboard = [],
  currentGroup,
  currentParticipantName,
  isLoading,
  leaderboardMode = 'points',
  leaderboardAsGrade = false,
  showAllGroups = false,
  onBack,
  onLogout,
  t,
}: LeaderboardViewProps) {
  const isGroupActivity = groupLeaderboard.length > 0;

  const rows = isGroupActivity
    ? leaderboard.filter((e) => e.group === currentGroup).map((e, i) => ({ ...e, rank: i + 1 }))
    : (() => {
        const myIdx = currentParticipantName
          ? leaderboard.findIndex((e) => e.name === currentParticipantName)
          : -1;
        const top = leaderboard.slice(0, 3);
        const tail = myIdx > 2
          ? leaderboard.slice(myIdx, myIdx + 4)
          : leaderboard.slice(3, 6);
        const seen = new Set<number>();
        return [...top, ...tail].filter((e) => {
          if (seen.has(e.rank)) return false;
          seen.add(e.rank);
          return true;
        });
      })();

  return (
    <PageRoot>
      <SparklesBg />

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
          <LangDrawer variant="darkHeader" only={languages ?? []} />
        </HeaderActions>
      </HeaderBar>

      <Content>
        <MainScroll>
          <PageTitle>{t.leaderboardTitle}</PageTitle>

          {!isLoading && groupLeaderboard.length > 0 && (
            <>
              <SectionTitle>{t.leaderboardGroupsTitle}</SectionTitle>
              <PlayerList style={{ marginBottom: 20 }}>
                {(() => {
                  if (showAllGroups) return groupLeaderboard;
                  const mine = currentGroup ? groupLeaderboard.find((g) => g.name === currentGroup) : undefined;
                  return mine ? [mine] : [];
                })().map((entry, i) => (
                  <PlayerCard
                    key={`g-${entry.rank}-${entry.name}`}
                    highlighted={currentGroup === entry.name}
                    animDelay={i}
                  >
                    <HexBadge gold={entry.rank <= 3}>{entry.rank}</HexBadge>
                    <PlayerName>{entry.name}</PlayerName>
                    <ScoreValue>{formatLeaderboardScore(entry.score)}</ScoreValue>
                  </PlayerCard>
                ))}
              </PlayerList>
              <SectionTitle>{t.leaderboardMyGroupTitle}</SectionTitle>
            </>
          )}

          {isLoading ? (
            <LoadingText>{t.leaderboardLoading}</LoadingText>
          ) : rows.length === 0 ? (
            <EmptyText>{t.leaderboardEmpty}</EmptyText>
          ) : (
            <PlayerList>
              {rows.map((entry, i) => {
                const isMe = currentParticipantName === entry.name;
                const isTop3 = entry.rank <= 3;
                return (
                  <PlayerCard
                    key={`${entry.rank}-${entry.name}`}
                    highlighted={isMe}
                    animDelay={i}
                  >
                    <HexBadge gold={isTop3}>{entry.rank}</HexBadge>

                    <PlayerName me={isMe}>{entry.name}</PlayerName>

                    <ScoreValue>
                      {leaderboardMode === 'both' ? (
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15, gap: 2 }}>
                          <span>{formatScore(entry.score, leaderboardAsGrade)}</span>
                          {entry.durationMs != null && (
                            <span style={{ fontSize: '0.72em', opacity: 0.78, fontWeight: 600 }}>
                              {formatDuration(entry.durationMs)}
                            </span>
                          )}
                        </span>
                      ) : leaderboardMode === 'time' && entry.durationMs != null
                        ? formatDuration(entry.durationMs)
                        : formatScore(entry.score, leaderboardAsGrade)}
                    </ScoreValue>
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
