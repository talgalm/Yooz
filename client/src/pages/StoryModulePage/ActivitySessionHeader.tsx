import React, { useCallback, useEffect, useRef, useState } from 'react';
import { keyframes, styled } from '@mui/material/styles';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
const ROADMAP_HEADER_BTN_BORDER = '#d4d4d4';
const ROADMAP_HEADER_BTN_BORDER_PUZZLE = 'rgba(0,0,0,0.45)';
const ROADMAP_HEADER_ICON_PX = 20;
const ROADMAP_HEADER_CELL_W = 76;

const GameHeader = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  padding: '10px 16px',
  backdropFilter: 'blur(8px)',
  '@media (min-width: 768px)': {
    padding: '10px max(16px, calc((100% - 960px) / 2))',
  },
});

const RoadmapHeaderTop = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
  minWidth: 0,
});

const RoadmapHeaderButtonRow = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: 14,
  direction: 'ltr',
});

const RoadmapHeaderItem = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: `0 0 ${ROADMAP_HEADER_CELL_W}px`,
  width: ROADMAP_HEADER_CELL_W,
  minWidth: ROADMAP_HEADER_CELL_W,
  maxWidth: ROADMAP_HEADER_CELL_W,
  minHeight: 36,
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.10)',
  borderRadius: 10,
  // The help button is wrapped in an inline-flex NudgeWrap <span>; stretch it so
  // its button fills the cell like the other (unwrapped) header buttons.
  '& > span': {
    width: '100%',
  },
  '& button': {
    width: '100%',
    minWidth: 0,
    height: 36,
    boxSizing: 'border-box',
    flexShrink: 0,
    fontSize: ROADMAP_HEADER_ICON_PX,
    fontWeight: 700,
    lineHeight: 1,
    border: `1px solid ${ROADMAP_HEADER_BTN_BORDER}`,
    '&:hover': {
      borderColor: '#e0e0e0',
    },
    '&:active': {
      borderColor: '#c4c4c4',
    },
    '& svg': {
      width: ROADMAP_HEADER_ICON_PX,
      height: ROADMAP_HEADER_ICON_PX,
      flexShrink: 0,
      display: 'block',
    },
  },
});

const RoadmapHeaderItemPuzzle = styled(RoadmapHeaderItem)({
  background: 'transparent',
  '& button': {
    border: `1px solid ${ROADMAP_HEADER_BTN_BORDER_PUZZLE}`,
    '&:hover': {
      borderColor: 'rgba(0,0,0,0.55)',
    },
    '&:active': {
      borderColor: 'rgba(0,0,0,0.65)',
    },
  },
});

export const SessionHeaderIconPlaceholder = styled('div')({
  width: ROADMAP_HEADER_CELL_W,
  height: 36,
  flexShrink: 0,
  boxSizing: 'border-box',
  visibility: 'hidden',
  pointerEvents: 'none',
});

const RoadmapHeaderPoints = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: ROADMAP_HEADER_CELL_W,
  height: 36,
  padding: '0 4px',
  boxSizing: 'border-box',
  borderRadius: 10,
  border: `1px solid ${ROADMAP_HEADER_BTN_BORDER}`,
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1,
  flexShrink: 0,
  minWidth: ROADMAP_HEADER_CELL_W,
  maxWidth: ROADMAP_HEADER_CELL_W,
  '& svg': {
    width: ROADMAP_HEADER_ICON_PX,
    height: ROADMAP_HEADER_ICON_PX,
    flexShrink: 0,
    display: 'block',
  },
});

const RoadmapHeaderPointsPuzzle = styled(RoadmapHeaderPoints)({
  border: `1px solid ${ROADMAP_HEADER_BTN_BORDER_PUZZLE}`,
  background: 'rgba(255,255,255,0.92)',
  color: '#1a1a1a',
});

const RoadmapHeaderPointsValue = styled('span')({
  fontVariantNumeric: 'tabular-nums',
});

const pointsDepositPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 210, 74, 0.35); }
  50% { box-shadow: 0 0 14px 3px rgba(245, 210, 74, 0.28); }
`;

/** Gold star — score icon (distinct from leaderboard trophy). */
export function SessionHeaderPointsIcon({
  variant = 'default',
  iconColor,
}: { variant?: 'default' | 'puzzle'; iconColor?: string } = {}) {
  const puzzle = variant === 'puzzle';
  const fill = puzzle ? '#1a1a1a' : (iconColor ?? '#ffffff');
  const stroke = puzzle ? 'rgba(0,0,0,0.22)' : (iconColor ? iconColor : 'rgba(255,255,255,0.6)');
  return (
    <svg viewBox="0 0 24 24" width={ROADMAP_HEADER_ICON_PX} height={ROADMAP_HEADER_ICON_PX} aria-hidden>
      <path
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        strokeLinejoin="round"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

/** Leaderboard podium — three rounded bars (center tallest). */
export function SessionHeaderTrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="2.5" y="9" width="5" height="12" rx="2.5" />
      <rect x="9.5" y="5" width="5" height="16" rx="2.5" />
      <rect x="16.5" y="13" width="5" height="8" rx="2.5" />
    </svg>
  );
}

function TimerDots({
  puzzleChrome,
  RoadmapPoints,
  iconColor,
}: { puzzleChrome: boolean; RoadmapPoints: React.ElementType; iconColor?: string }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 4) + 1), 400);
    return () => clearInterval(id);
  }, []);
  const color = puzzleChrome ? '#1a1a1a' : (iconColor ?? '#fff');
  return (
    <RoadmapPoints role="status" aria-label="loading" style={{ color, fontSize: 16, letterSpacing: 2 }}>
      <RoadmapHeaderPointsValue>{'·'.repeat(dots)}</RoadmapHeaderPointsValue>
    </RoadmapPoints>
  );
}

const SessionHeaderTopRow = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  minWidth: 0,
});

export interface ActivitySessionHeaderProps {
  onLogout: () => void;
  currentPoints: number;
  t: Record<string, string>;
  /** Leaderboard, music/mute, or `<SessionHeaderIconPlaceholder />` to hold width. */
  thirdSlot: React.ReactNode;
  /** e.g. station hint — rendered above the four-cell row. */
  topRow?: React.ReactNode;
  /** When set, counts displayed points from `from` up to `to` (roadmap after a game). */
  pointsRoll?: { from: number; to: number } | null;
  onPointsRollComplete?: () => void;
  /** Black control outlines instead of light gray (puzzle game). */
  chromeVariant?: 'default' | 'puzzle';
  /** Remove backdrop blur and border — floats over content (text/video/image stations). */
  transparentChrome?: boolean;
  /** When true, skip the third header cell (leaderboard/music) and use a 3-column layout. */
  omitThirdSlot?: boolean;
  /** 'time' = timer only, 'both' = points + timer stacked, default = points only. */
  leaderboardMode?: 'points' | 'time' | 'both';
  /** Elapsed seconds since activity start (used in time mode). */
  elapsedSeconds?: number;
  /** Optional time limit in minutes — timer turns red when exceeded. */
  activityDurationMinutes?: number;
  /** Cosmetic count-up timer shown above the button row; turns red after this
   *  many minutes. Independent of leaderboardMode (roadmap views only). */
  roadmapTimerMinutes?: number;
  /** Theme kit icon color — applied on default chrome only. */
  headerIconColor?: string;
}

/**
 * Single session header: exit → help → third slot → points (LTR).
 * Same chrome as the roadmap; use during roadmap, games, and stations.
 */
export default function ActivitySessionHeader({
  onLogout,
  currentPoints,
  t,
  thirdSlot,
  topRow,
  pointsRoll,
  onPointsRollComplete,
  chromeVariant = 'default',
  transparentChrome = false,
  omitThirdSlot = false,
  leaderboardMode = 'points',
  elapsedSeconds = 0,
  activityDurationMinutes,
  roadmapTimerMinutes,
  headerIconColor,
}: ActivitySessionHeaderProps) {
  const puzzleChrome = chromeVariant === 'puzzle';
  const iconColor = puzzleChrome ? undefined : headerIconColor;
  const RoadmapItem = puzzleChrome ? RoadmapHeaderItemPuzzle : RoadmapHeaderItem;
  const RoadmapPoints = puzzleChrome ? RoadmapHeaderPointsPuzzle : RoadmapHeaderPoints;
  const showFakeTimer = roadmapTimerMinutes != null && roadmapTimerMinutes > 0;
  // 'both' mode (and the cosmetic roadmap timer) add an extra cell — let cells
  // shrink so they fit narrow phones.
  const compact = leaderboardMode === 'both' || showFakeTimer;
  const compactCellStyle: React.CSSProperties = {
    flex: '1 1 0',
    width: 'auto',
    minWidth: 0,
    maxWidth: ROADMAP_HEADER_CELL_W,
  };
  const compactPointsStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  };
  const [displayedPoints, setDisplayedPoints] = useState(() => (
    pointsRoll && pointsRoll.to > pointsRoll.from ? pointsRoll.from : currentPoints
  ));
  const [isRolling, setIsRolling] = useState(false);
  const rollCompleteRef = useRef(onPointsRollComplete);
  rollCompleteRef.current = onPointsRollComplete;

  const finishRoll = useCallback(() => {
    setIsRolling(false);
    rollCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (pointsRoll) return;
    setDisplayedPoints(currentPoints);
  }, [currentPoints, pointsRoll]);

  useEffect(() => {
    if (!pointsRoll) {
      setIsRolling(false);
      return;
    }
    const { from, to } = pointsRoll;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (to <= from || reducedMotion) {
      setDisplayedPoints(to);
      setIsRolling(false);
      finishRoll();
      return;
    }

    setIsRolling(true);
    setDisplayedPoints(from);
    let raf = 0;
    const durationMs = Math.min(2200, 480 + (to - from) * 14);
    const t0 = performance.now();

    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - u) ** 3;
      const v = Math.round(from + (to - from) * eased);
      setDisplayedPoints(v);
      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplayedPoints(to);
        setIsRolling(false);
        finishRoll();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointsRoll, finishRoll]);

  return (
    <GameHeader style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      flexShrink: 0,
      background: 'transparent',
      boxShadow: 'none',
      borderBottom: puzzleChrome ? '1px solid rgba(0,0,0,0.42)' : '1px solid #DCDCDC',
    }}
    >
      <RoadmapHeaderTop>
        {topRow ? <SessionHeaderTopRow>{topRow}</SessionHeaderTopRow> : null}
        <RoadmapHeaderButtonRow style={compact ? { gap: 8 } : undefined}>
          <RoadmapItem style={compact ? compactCellStyle : undefined}>
            <ActivityLogoutButton
              onClick={onLogout}
              ariaLabel={t.exitActivity}
              variant={puzzleChrome ? 'puzzle' : 'default'}
              iconColor={iconColor}
            />
          </RoadmapItem>
          <RoadmapItem style={compact ? compactCellStyle : undefined}>
            <HelpChatHeaderButton tone={puzzleChrome ? 'puzzle' : 'dark'} iconColor={iconColor} />
          </RoadmapItem>
          {showFakeTimer ? (() => {
            const mins = Math.floor(elapsedSeconds / 60);
            const secs = elapsedSeconds % 60;
            const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            // Fake timer: only the color changes once the limit is reached.
            const isOver = elapsedSeconds >= (roadmapTimerMinutes as number) * 60;
            const color = isOver ? '#e74c3c' : (puzzleChrome ? '#1a1a1a' : (iconColor ?? '#fff'));
            return (
              <RoadmapItem style={compact ? compactCellStyle : undefined}>
                <RoadmapPoints
                  role="timer"
                  aria-label={timeStr}
                  style={{
                    ...(compact ? compactPointsStyle : {}),
                    color,
                    borderColor: isOver ? 'rgba(231,76,60,0.5)' : undefined,
                    fontSize: 13,
                  }}
                >
                  <RoadmapHeaderPointsValue>{timeStr}</RoadmapHeaderPointsValue>
                  {compact ? null : (
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                </RoadmapPoints>
              </RoadmapItem>
            );
          })() : null}
          {!omitThirdSlot ? (
            <RoadmapItem style={compact ? compactCellStyle : undefined}>
              {thirdSlot}
            </RoadmapItem>
          ) : null}
          {(() => {
            const mins = Math.floor(elapsedSeconds / 60);
            const secs = elapsedSeconds % 60;
            const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            const isOver = activityDurationMinutes != null && elapsedSeconds >= activityDurationMinutes * 60;
            const timeColor = isOver ? '#e74c3c' : (puzzleChrome ? '#1a1a1a' : (iconColor ?? '#fff'));
            const ClockSvg = (size: number) => (
              <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            );

            const pointsCell = (
              <RoadmapItem style={compact ? compactCellStyle : undefined}>
                <RoadmapPoints
                  role="status"
                  aria-label={`${displayedPoints} ${t.points}`}
                  style={{
                    ...(compact ? compactPointsStyle : {}),
                    ...(iconColor ? { color: iconColor } : {}),
                    ...(isRolling ? { animation: `${pointsDepositPulse} 0.85s ease-in-out infinite` } : {}),
                  }}
                >
                  <RoadmapHeaderPointsValue>{displayedPoints}</RoadmapHeaderPointsValue>
                  <SessionHeaderPointsIcon variant={puzzleChrome ? 'puzzle' : 'default'} iconColor={iconColor} />
                </RoadmapPoints>
              </RoadmapItem>
            );

            const timerCell = (
              <RoadmapItem style={compact ? compactCellStyle : undefined}>
                {elapsedSeconds === 0 ? (
                  <TimerDots puzzleChrome={puzzleChrome} RoadmapPoints={RoadmapPoints} iconColor={iconColor} />
                ) : (
                  <RoadmapPoints
                    role="status"
                    aria-label={timeStr}
                    style={{
                      ...(compact ? compactPointsStyle : {}),
                      color: timeColor,
                      borderColor: isOver ? 'rgba(231,76,60,0.5)' : undefined,
                      fontSize: 13,
                    }}
                  >
                    <RoadmapHeaderPointsValue>{timeStr}</RoadmapHeaderPointsValue>
                    {compact ? null : ClockSvg(16)}
                  </RoadmapPoints>
                )}
              </RoadmapItem>
            );

            if (leaderboardMode === 'time') return timerCell;
            if (leaderboardMode === 'both') return <>{pointsCell}{timerCell}</>;
            return pointsCell;
          })()}
        </RoadmapHeaderButtonRow>
      </RoadmapHeaderTop>
    </GameHeader>
  );
}
