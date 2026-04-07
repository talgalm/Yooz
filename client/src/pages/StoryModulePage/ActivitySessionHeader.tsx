import React, { useCallback, useEffect, useRef, useState } from 'react';
import { keyframes, styled } from '@mui/material/styles';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
const ROADMAP_HEADER_BTN_BORDER = '#d4d4d4';
const ROADMAP_HEADER_ICON_PX = 20;
const ROADMAP_HEADER_CELL_W = 76;

const GameHeader = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  padding: '10px 16px',
  backdropFilter: 'blur(8px)',
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

const RoadmapHeaderPointsValue = styled('span')({
  fontVariantNumeric: 'tabular-nums',
});

const pointsDepositPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 210, 74, 0.35); }
  50% { box-shadow: 0 0 14px 3px rgba(245, 210, 74, 0.28); }
`;

/** Gold star — score icon (distinct from leaderboard trophy). */
export function SessionHeaderPointsIcon() {
  return (
    <svg viewBox="0 0 24 24" width={ROADMAP_HEADER_ICON_PX} height={ROADMAP_HEADER_ICON_PX} aria-hidden>
      <path
        fill="#ffffff"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1"
        strokeLinejoin="round"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

/** Stroke trophy — same paths as roadmap. */
export function SessionHeaderTrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
      <path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
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
}: ActivitySessionHeaderProps) {
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
      borderBottom: '1px solid #DCDCDC',
    }}
    >
      <RoadmapHeaderTop>
        {topRow ? <SessionHeaderTopRow>{topRow}</SessionHeaderTopRow> : null}
        <RoadmapHeaderButtonRow>
          <RoadmapHeaderItem>
            <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            <HelpChatHeaderButton />
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            {thirdSlot}
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            <RoadmapHeaderPoints
              role="status"
              aria-label={`${displayedPoints} ${t.points}`}
              style={isRolling ? {
                animation: `${pointsDepositPulse} 0.85s ease-in-out infinite`,
              } : undefined}
            >
              <RoadmapHeaderPointsValue>{displayedPoints}</RoadmapHeaderPointsValue>
              <SessionHeaderPointsIcon />
            </RoadmapHeaderPoints>
          </RoadmapHeaderItem>
        </RoadmapHeaderButtonRow>
      </RoadmapHeaderTop>
    </GameHeader>
  );
}
