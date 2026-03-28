import React, { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
import { DarkHeaderActionIconButton } from '../../components/styled';
import type { ModuleItemData } from './types';
import storySideWave from '../../assets/story-side-wave.svg';
import storySideWaveBlue from '../../assets/story-side-wave-blue.svg';
import storySideWaveDesert from '../../assets/story-side-wave-desert.svg';
import { ROADMAP_DECORATIONS } from './roadmapTrees';
import { getThemeKit, OCEAN_DECORATIONS, DESERT_DECORATIONS, type RoadmapThemeKit } from './roadmapThemes';

// ─── Constants ───

const NODE_SIZE = 80;
const VERTICAL_SPACING = 190;   // vertical distance between rows
const PADDING_TOP = 80;
const PADDING_BOTTOM = 100;
const TRACK_LEFT_PCT = 12;
const TRACK_RIGHT_PCT = 88;
const NODE_LEFT_PCT = 24;
const NODE_RIGHT_PCT = 76;
const ROAD_WIDTH = 11;
const ROAD_BORDER = 16;

// ─── Header styled components ───

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

const ROADMAP_HEADER_BTN_BORDER = '#d4d4d4';
/** Visual size for logout / help / trophy / points icon (matches `ActivityLogoutButton` SVG). */
const ROADMAP_HEADER_ICON_PX = 20;
/** Every header slot (logout, help, leaderboard, points) uses the same outer width. */
const ROADMAP_HEADER_CELL_W = 76;

const RoadmapHeaderButtonRow = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: 14,
  // Keep order: exit → help → leaderboard → points (ignore document RTL mirroring).
  direction: 'ltr',
});

/** One header control; flex row above spaces four siblings evenly across the bar. */
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
  background: 'rgba(255,255,255,0.10)',  // 10% opacity white background
  borderRadius: 10, // rounded corners
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

/** Holds leaderboard slot width when the button is not shown so spacing stays even. */
const RoadmapHeaderIconPlaceholder = styled('div')({
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

const HeaderGroupName = styled('span')({
  fontSize: 11,
  color: 'rgba(255,255,255,0.7)',
  fontWeight: 500,
});

// ─── Animations ───

const pulse = keyframes`
  0%, 100% { transform: translate(-50%,-50%) scale(1); box-shadow: 0 4px 12px rgba(0,0,0,.25); }
  50%       { transform: translate(-50%,-50%) scale(1.07); box-shadow: 0 4px 22px rgba(0,0,0,.38); }
`;
const footstepAppear = keyframes`
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  50%  { opacity: .7; transform: translate(-50%,-50%) scale(1.1); }
  100% { opacity: .5; transform: translate(-50%,-50%) scale(1); }
`;
const nodePopIn = keyframes`
  0%   { transform: translate(-50%,-50%) scale(.8); opacity: .5; }
  50%  { transform: translate(-50%,-50%) scale(1.15); }
  100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
`;
const fishSwim = keyframes`
  0%   { transform: translateX(-120px); }
  100% { transform: translateX(calc(100vw + 120px)); }
`;
/** Nature sky: straight L→R drift; width from --roadmap-w on PathCanvas (scrolls with layout). */
const cloudDrift = keyframes`
  0%   { transform: translateX(-140px); }
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 140px)); }
`;
const fishWobble = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%      { transform: translateY(-8px) rotate(-2deg); }
  75%      { transform: translateY(8px) rotate(2deg); }
`;
const tumbleweedDrift = keyframes`
  0%   { transform: translateX(-100px); }
  100% { transform: translateX(calc(100vw + 100px)); }
`;
const tumbleweedBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-28px); }
`;
const tumbleweedSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Styled Components ───

const RoadmapContainer = styled('div')({
  display: 'flex', flexDirection: 'column', height: '100dvh',
  overflow: 'hidden',
});

const ScrollArea = styled('div')({
  flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
  position: 'relative', WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
});

const PathCanvas = styled('div')<{ height: number }>(({ height }) => ({
  position: 'relative', width: '100%', height, minHeight: '100%',
}));

const NodeWrapper = styled('div')<{ state: 'completed' | 'active' | 'locked'; animateIn?: boolean }>(
  ({ state, animateIn }) => ({
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: '50%',
    transform: 'translate(-50%,-50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: state === 'active' ? 'pointer' : 'default',
    zIndex: 10,
    border: `5px solid var(--node-${state}-border)`,
    background: `var(--node-${state}-bg)`,
    boxShadow: state === 'active' ? '0 6px 20px rgba(0,0,0,.3)' : '0 4px 12px rgba(0,0,0,.2)',
    animation: state === 'active'
      ? `${pulse} 1.5s ease-in-out infinite`
      : animateIn ? `${nodePopIn} 0.4s ease-out` : 'none',
    transition: 'transform .1s, box-shadow .1s',
    '&:active': state === 'active' ? {
      transform: 'translate(-50%, calc(-50% + 4px))',
      boxShadow: '0 0 0 transparent',
    } : {},
  }),
);

const NodeNumber = styled('span')<{ state: 'completed' | 'active' | 'locked' }>(({ state }) => ({
  fontSize: 30, fontWeight: 900, color: '#fff', userSelect: 'none',
  lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,.2)',
  opacity: state === 'locked' ? 0.6 : 1,
}));

const FootprintEl = styled('div')<{ delay: number; isRight?: boolean }>(({ delay, isRight }) => ({
  position: 'absolute', width: 22, height: 22,
  transform: 'translate(-50%,-50%)', opacity: 0,
  animation: `${footstepAppear} 0.4s ease-out ${delay}s forwards`,
  zIndex: 8, '& svg': { transform: isRight ? 'scaleX(-1)' : 'none' },
}));

const RoadsideWaveDecoration = styled('img')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 0,
  opacity: 0.9,
});

const TreeDecoration = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  opacity: 0.95,
  '& > svg': {
    width: '100%',
    height: '100%',
    display: 'block',
  },
});

const HouseDecoration = styled('img')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 5,
  opacity: 0.95,
});

const FishOuter = styled('div')<{ duration: number; top: number }>(({ duration, top }) => ({
  position: 'fixed',
  left: 0,
  top,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 50,
  animation: `${fishSwim} ${duration}s linear forwards`,
}));

const FishWobbleWrap = styled('div')<{ wobbleDuration: number }>(({ wobbleDuration }) => ({
  animation: `${fishWobble} ${wobbleDuration}s ease-in-out infinite`,
}));

/** Clips cloud transforms so they don’t widen scroll overflow and shift the roadmap horizontally. */
const CloudSkyLayer = styled('div')({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: 280,
  overflow: 'hidden',
  pointerEvents: 'none',
  // Above road, trees, and station nodes (10); below sticky header (30)
  zIndex: 15,
});

const CloudOuter = styled('div')<{ duration: number; top: number }>(({ duration, top }) => ({
  position: 'absolute',
  left: 0,
  top,
  pointerEvents: 'none',
  userSelect: 'none',
  willChange: 'transform',
  animation: `${cloudDrift} ${duration}s linear forwards`,
}));

const TumbleweedOuter = styled('div')<{ duration: number; top: number }>(({ duration, top }) => ({
  position: 'fixed',
  left: 0,
  top,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 50,
  animation: `${tumbleweedDrift} ${duration}s linear forwards`,
}));

const TumbleweedBounceWrap = styled('div')<{ bounceDuration: number }>(({ bounceDuration }) => ({
  animation: `${tumbleweedBounce} ${bounceDuration}s ease-in-out infinite`,
}));

const TumbleweedSpinWrap = styled('img')<{ spinDuration: number }>(({ spinDuration }) => ({
  display: 'block',
  opacity: 1,
  animation: `${tumbleweedSpin} ${spinDuration}s linear infinite`,
}));

const FootprintSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" stroke="#d9d9d9" strokeWidth={1.8} strokeLinejoin="round">
    <ellipse cx="8" cy="6" rx="3" ry="4" />
    <ellipse cx="16" cy="6" rx="3" ry="4" />
    <ellipse cx="12" cy="17" rx="5" ry="5.5" />
  </svg>
);

const FISH_PALETTES = [
  { body: '#FFB84D', fin: '#FF9E33', stripe: '#E89030' },
  { body: '#5ED4F5', fin: '#3BB8D8', stripe: '#2AA0C0' },
  { body: '#FF8FAB', fin: '#E86B8A', stripe: '#D05070' },
  { body: '#7BE87B', fin: '#50C850', stripe: '#38A838' },
  { body: '#C89BFF', fin: '#A070E8', stripe: '#8850D0' },
  { body: '#FFD966', fin: '#F0C030', stripe: '#D0A020' },
];

const DriftingCloudSvg = ({ width }: { width: number }) => {
  const h = width * 0.48;
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 100 48"
      aria-hidden
      style={{
        display: 'block',
        opacity: 0.94,
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.12))',
      }}
    >
      <ellipse cx="28" cy="30" rx="24" ry="15" fill="#fff" />
      <ellipse cx="50" cy="26" rx="30" ry="17" fill="#fff" />
      <ellipse cx="74" cy="30" rx="20" ry="13" fill="#fff" />
      <ellipse cx="42" cy="34" rx="18" ry="11" fill="#f8fafc" />
    </svg>
  );
};

const SwimmingFishSvg = ({ size, palette }: { size: number; palette: number }) => {
  const c = FISH_PALETTES[palette % FISH_PALETTES.length];
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 50 30" style={{ transform: 'scaleX(-1)' }}>
      <path d="M38,15 Q32,6 20,5 Q10,6 4,15 Q10,24 20,25 Q32,24 38,15 Z" fill={c.body} />
      <path d="M38,15 L48,6 L48,24 Z" fill={c.fin} />
      <circle cx="12" cy="13" r="2" fill="#333" />
      <circle cx="11.5" cy="12.5" r="0.8" fill="#fff" />
      <path d="M20,10 Q25,8 30,10" stroke={c.stripe} strokeWidth="0.8" fill="none" />
      <path d="M20,20 Q25,22 30,20" stroke={c.stripe} strokeWidth="0.8" fill="none" />
    </svg>
  );
};

// ─── Background ───

function SceneBackground({ width: W, height: H, kit }: { width: number; height: number; kit: RoadmapThemeKit }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={kit.sceneBgTop} />
          <stop offset="55%" stopColor={kit.sceneBgMid} />
          <stop offset="100%" stopColor={kit.sceneBgBottom} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#bgGrad)" />
    </svg>
  );
}

// ─── Decorations ───

function WorldDecorations(_: { W: number; numRows: number; totalH: number }) {
  return null;
}

// ─── Path Helpers ───
// Layout:
// - Rows alternate between 2 stations and 1 centred station.
// - The road snakes vertically with rounded quarter-circle turns.

function getRowY(row: number) {
  return PADDING_TOP + row * VERTICAL_SPACING;
}

function getTrackMetrics(W: number) {
  const left = W * TRACK_LEFT_PCT / 100;
  const right = W * TRACK_RIGHT_PCT / 100;
  const radius = Math.min((right - left) / 2 - 8, VERTICAL_SPACING / 2 - 8);
  return {
    trackLeft: left,
    trackRight: right,
    nodeLeft: W * NODE_LEFT_PCT / 100,
    nodeRight: W * NODE_RIGHT_PCT / 100,
    center: W / 2,
    turnRadius: Math.max(28, radius),
  };
}

function getNumRows(n: number) {
  let remaining = n;
  let rows = 0;
  while (remaining > 0) {
    remaining -= rows % 2 === 0 ? 2 : 1;
    rows += 1;
  }
  return rows;
}

function getContentHeight(numItems: number) {
  return PADDING_TOP + Math.max(0, getNumRows(numItems) - 1) * VERTICAL_SPACING + PADDING_BOTTOM;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createSeededRandom(seed: number) {
  let state = (seed || 1) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

type Rect = { left: number; top: number; right: number; bottom: number };

function rectsOverlap(a: Rect, b: Rect, padding = 0): boolean {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  );
}

/** X/Y of station `index` on screen of width `W`. */
function getNodePosition(index: number, W: number): { x: number; y: number } {
  const { nodeLeft, nodeRight, center } = getTrackMetrics(W);
  let remainingIndex = index;
  let row = 0;

  while (true) {
    const isDoubleRow = row % 2 === 0;
    const rowCount = isDoubleRow ? 2 : 1;
    if (remainingIndex < rowCount) {
      const goesLeftToRight = row % 2 === 0;
      if (!isDoubleRow) {
        return { x: center, y: getRowY(row) };
      }
      if (goesLeftToRight) {
        return { x: remainingIndex === 0 ? nodeLeft : nodeRight, y: getRowY(row) };
      }
      return { x: remainingIndex === 0 ? nodeRight : nodeLeft, y: getRowY(row) };
    }
    remainingIndex -= rowCount;
    row += 1;
  }
}

/**
 * Builds a thick top-to-bottom snake with circular side turns.
 */
function buildSvgPath(items: ModuleItemData[], W: number): string {
  if (!items.length || W <= 0) return '';
  const numRows = getNumRows(items.length);
  const { trackLeft, trackRight, turnRadius } = getTrackMetrics(W);
  let d = `M ${trackLeft} ${getRowY(0)}`;

  for (let row = 0; row < numRows; row++) {
    const y = getRowY(row);
    const goesLeftToRight = row % 2 === 0;
    const rowEnd = goesLeftToRight ? trackRight : trackLeft;
    const lineEnd = row === numRows - 1
      ? rowEnd
      : goesLeftToRight ? trackRight - turnRadius : trackLeft + turnRadius;

    d += ` L ${lineEnd} ${y}`;

    if (row === numRows - 1) {
      continue;
    }

    const nextY = getRowY(row + 1);
    if (goesLeftToRight) {
      d += ` A ${turnRadius} ${turnRadius} 0 0 1 ${trackRight} ${y + turnRadius}`;
      d += ` L ${trackRight} ${nextY - turnRadius}`;
      d += ` A ${turnRadius} ${turnRadius} 0 0 1 ${trackRight - turnRadius} ${nextY}`;
    } else {
      d += ` A ${turnRadius} ${turnRadius} 0 0 0 ${trackLeft} ${y + turnRadius}`;
      d += ` L ${trackLeft} ${nextY - turnRadius}`;
      d += ` A ${turnRadius} ${turnRadius} 0 0 0 ${trackLeft + turnRadius} ${nextY}`;
    }
  }

  return d;
}

/** Linear interpolation along the segment between two consecutive stations (used for footsteps). */
function getPointsAlongSegment(
  fromIndex: number, toIndex: number, W: number, count: number, totalItems: number,
): { x: number; y: number }[] {
  const from = getNodePosition(fromIndex, W);
  const to = getNodePosition(toIndex, W);

  const linearFallback = () => Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  });

  if (count <= 0 || W <= 0 || totalItems <= 0) return [];

  const numRows = getNumRows(totalItems);
  const { trackLeft, trackRight, turnRadius } = getTrackMetrics(W);
  const samples: Array<{ x: number; y: number }> = [];

  const pushPoint = (x: number, y: number) => {
    const prev = samples[samples.length - 1];
    if (!prev || Math.hypot(prev.x - x, prev.y - y) > 0.1) {
      samples.push({ x, y });
    }
  };

  const sampleLine = (
    x1: number, y1: number, x2: number, y2: number,
  ) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      pushPoint(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    }
  };

  const sampleArc = (
    cx: number, cy: number, r: number, startAngle: number, endAngle: number,
  ) => {
    const arcLen = Math.abs(endAngle - startAngle) * r;
    const steps = Math.max(1, Math.ceil(arcLen / 6));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const a = startAngle + (endAngle - startAngle) * t;
      pushPoint(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };

  const firstY = getRowY(0);
  pushPoint(trackLeft, firstY);

  for (let row = 0; row < numRows; row += 1) {
    const y = getRowY(row);
    const goesLeftToRight = row % 2 === 0;
    const rowEnd = goesLeftToRight ? trackRight : trackLeft;
    const lineEnd = row === numRows - 1
      ? rowEnd
      : goesLeftToRight ? trackRight - turnRadius : trackLeft + turnRadius;

    sampleLine(samples[samples.length - 1].x, samples[samples.length - 1].y, lineEnd, y);

    if (row === numRows - 1) continue;

    const nextY = getRowY(row + 1);
    if (goesLeftToRight) {
      sampleArc(trackRight - turnRadius, y + turnRadius, turnRadius, -Math.PI / 2, 0);
      sampleLine(trackRight, y + turnRadius, trackRight, nextY - turnRadius);
      sampleArc(trackRight - turnRadius, nextY - turnRadius, turnRadius, 0, Math.PI / 2);
    } else {
      sampleArc(trackLeft + turnRadius, y + turnRadius, turnRadius, -Math.PI / 2, -Math.PI);
      sampleLine(trackLeft, y + turnRadius, trackLeft, nextY - turnRadius);
      sampleArc(trackLeft + turnRadius, nextY - turnRadius, turnRadius, Math.PI, Math.PI / 2);
    }
  }

  if (samples.length < 2) return linearFallback();

  const nearestIndex = (pt: { x: number; y: number }, fromSampleIdx = 0) => {
    let bestIdx = fromSampleIdx;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = fromSampleIdx; i < samples.length; i += 1) {
      const dx = samples[i].x - pt.x;
      const dy = samples[i].y - pt.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const startIdx = nearestIndex(from);
  const endIdx = nearestIndex(to, startIdx);
  if (endIdx <= startIdx) return linearFallback();

  const route = [from, ...samples.slice(startIdx, endIdx + 1), to];
  if (route.length < 2) return linearFallback();

  const distances = [0];
  for (let i = 1; i < route.length; i += 1) {
    const prev = route[i - 1];
    const curr = route[i];
    distances.push(distances[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y));
  }

  const totalLength = distances[distances.length - 1];
  if (!Number.isFinite(totalLength) || totalLength <= 0.001) return linearFallback();

  const result: Array<{ x: number; y: number }> = [];
  let segIdx = 1;

  for (let i = 1; i <= count; i += 1) {
    const target = (totalLength * i) / (count + 1);
    while (segIdx < distances.length - 1 && distances[segIdx] < target) {
      segIdx += 1;
    }
    const aIdx = Math.max(0, segIdx - 1);
    const bIdx = segIdx;
    const a = route[aIdx];
    const b = route[bIdx];
    const segStart = distances[aIdx];
    const segEnd = distances[bIdx];
    const segLen = Math.max(0.0001, segEnd - segStart);
    const t = (target - segStart) / segLen;
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }

  return result;
}

// ─── Component ───

interface RoadmapViewProps {
  items: ModuleItemData[];
  currentItemIndex: number;
  completedCount: number;
  /** Running total (games) minus hint penalties — same basis as the finish screen. */
  currentPoints: number;
  showFootsteps: boolean;
  onFootstepsComplete: () => void;
  onNodeTap: (index: number) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  activityName: string;
  groupName?: string;
  popupModal: React.ReactNode;
  t: Record<string, string>;
  theme?: string;
}

/** Stacked coins — score / currency (distinct from leaderboard trophy). */
function RoadmapHeaderPointsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="10" cy="15" rx="6.5" ry="4.5" fill="#b8890f" transform="rotate(-12 10 15)" />
      <ellipse cx="14" cy="13" rx="6.5" ry="4.5" fill="#d9a012" transform="rotate(8 14 13)" />
      <ellipse cx="12" cy="11.5" rx="6" ry="4.2" fill="#f5d24a" stroke="#a67c00" strokeWidth="0.85" />
    </svg>
  );
}

/** Stroke trophy (Lucide-style paths) — avoids broken fills from ambiguous decimals in compact Material paths. */
function RoadmapHeaderTrophyIcon() {
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

export default function RoadmapView({
  items, currentItemIndex, completedCount, currentPoints, showFootsteps,
  onFootstepsComplete, onNodeTap, onLogout, onViewLeaderboard, groupName, popupModal, t, theme,
}: RoadmapViewProps) {
  const kit = useMemo(() => getThemeKit(theme), [theme]);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);
  const footstepsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeSeedRef = useRef(Math.floor(Math.random() * 2147483646) + 1);

  const [W, setW]               = useState(0);
  const [scrollAreaH, setScrollAreaH] = useState(0);

  // Measure width from the scroll container (stable), not PathCanvas — animated cloud transforms
  // must not affect layout width or stations will appear to drift with the clouds.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setW(w);
    });
    ro.observe(el);
    setW(el.clientWidth || 0);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setScrollAreaH(h);
    });
    ro.observe(el);
    setScrollAreaH(el.clientHeight || 0);
    return () => ro.disconnect();
  }, []);

  const contentHeight = getContentHeight(items.length);
  const totalHeight   = Math.max(contentHeight, scrollAreaH);
  const numRows       = getNumRows(items.length);

  const getCenteredScrollTop = useCallback(
    (index: number, width: number, containerH: number) => {
      if (width <= 0 || containerH <= 0) return 0;
      const nodeY = getNodePosition(index, width).y;
      const maxScroll = Math.max(0, totalHeight - containerH);
      return Math.min(Math.max(0, nodeY - containerH / 2), maxScroll);
    },
    [totalHeight],
  );

  const svgPath = useMemo(
    () => W > 0 ? buildSvgPath(items, W) : '',
    [items, W],
  );

  const footstepPoints = useMemo(() => {
    if (!showFootsteps || completedCount < 1 || W <= 0) return [];
    const toIdx = completedCount;
    if (toIdx >= items.length) return [];
    return getPointsAlongSegment(completedCount - 1, toIdx, W, 6, items.length);
  }, [showFootsteps, completedCount, items.length, W]);

  const sideWavePlacements = useMemo(() => {
    if (W <= 0 || items.length < 3) {
      return { left: [], right: [] } as {
        left: Array<{ left: number; top: number; width: number }>;
        right: Array<{ left: number; top: number; width: number }>;
      };
    }

    const left: Array<{ left: number; top: number; width: number }> = [];
    const right: Array<{ left: number; top: number; width: number }> = [];

    // Left-side waves: stations 1-3, 4-6, 7-9, ...
    for (let start = 0; start + 2 < items.length; start += 3) {
      const from = getNodePosition(start, W);
      const to = getNodePosition(start + 2, W);
      left.push({
        left: Math.max(10, W * 0.17),
        top: (from.y + to.y) / 2,
        width: Math.max(52, W * 0.34),
      });
    }

    // Right-side waves: stations 3-5, 6-8, 9-11, ...
    for (let start = 2; start + 2 < items.length; start += 3) {
      const from = getNodePosition(start, W);
      const to = getNodePosition(start + 2, W);
      right.push({
        left: Math.min(W - 10, W * 0.8),
        top: (from.y + to.y) / 2 - 20,
        width: Math.max(48, W * 0.5),
      });
    }

    return { left, right };
  }, [W, items.length]);

  const themedDecorations = useMemo(() => {
    if (theme === 'ocean') return OCEAN_DECORATIONS;
    if (theme === 'desert') return DESERT_DECORATIONS;
    return ROADMAP_DECORATIONS;
  }, [theme]);

  const treePlacements = useMemo(() => {
    if (W <= 0 || totalHeight <= 0 || items.length < 2) {
      return [] as Array<{
        svg: string;
        category: string;
        left: number;
        top: number;
        width: number;
        height: number;
        flipX: boolean;
      }>;
    }

    const { trackLeft, trackRight } = getTrackMetrics(W);
    const seed = hashString(items.map((item) => item._id).join('|')) + W * 11 + totalHeight * 3 + treeSeedRef.current;
    const rng = createSeededRandom(seed);

    const singletonCategories = new Set(['Anchor']);
    const primaryCategory = kit.decorationCategories[0] || 'Trees';
    const primaryDecorations = themedDecorations.filter((item) => item.category === primaryCategory && !singletonCategories.has(item.category));
    const otherDecorations = themedDecorations.filter((item) => item.category !== primaryCategory && !singletonCategories.has(item.category));
    const singletonDecorations = themedDecorations.filter((item) => singletonCategories.has(item.category));
    const wantedPrimaryCount = primaryDecorations.length > 0 ? 30 : 0;
    const wantedOtherCount = otherDecorations.length > 0 ? 40 : 0;

    const forbiddenRects: Rect[] = [];

    const roadHalf = ROAD_WIDTH / 2 + 2;
    for (let row = 0; row < numRows; row += 1) {
      const y = getRowY(row);
      forbiddenRects.push({
        left: trackLeft - roadHalf,
        right: trackRight + roadHalf,
        top: y - roadHalf,
        bottom: y + roadHalf,
      });

      if (row < numRows - 1) {
        const nextY = getRowY(row + 1);
        const x = row % 2 === 0 ? trackRight : trackLeft;
        forbiddenRects.push({
          left: x - roadHalf,
          right: x + roadHalf,
          top: y,
          bottom: nextY,
        });
      }
    }

    const placements: Array<{
      svg: string;
      category: string;
      left: number;
      top: number;
      width: number;
      height: number;
      flipX: boolean;
    }> = [];

    for (const singleton of singletonDecorations) {
      const singletonWidth = 70 + rng() * 30;
      const singletonHeight = singletonWidth * (singleton.viewBoxHeight / singleton.viewBoxWidth);
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const x = 20 + rng() * Math.max(1, W - 40);
        const y = 120 + rng() * Math.max(1, totalHeight - 200);
        const rect: Rect = {
          left: x - singletonWidth / 2,
          right: x + singletonWidth / 2,
          top: y - singletonHeight,
          bottom: y,
        };
        const overlapsForbidden = forbiddenRects.some((forbidden) => rectsOverlap(rect, forbidden, 4));
        if (overlapsForbidden) continue;
        placements.push({
          svg: singleton.svg,
          category: singleton.category,
          left: x,
          top: y,
          width: singletonWidth,
          height: singletonHeight,
          flipX: false,
        });
        forbiddenRects.push(rect);
        break;
      }
    }

    const wantedDecorations = [
      ...Array.from({ length: wantedPrimaryCount }, () =>
        primaryDecorations[Math.floor(rng() * primaryDecorations.length)]),
      ...Array.from({ length: wantedOtherCount }, () =>
        otherDecorations[Math.floor(rng() * otherDecorations.length)]),
    ];

    for (let i = wantedDecorations.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [wantedDecorations[i], wantedDecorations[j]] = [wantedDecorations[j], wantedDecorations[i]];
    }

    const tryLimit = 12000;

    for (let attempt = 0; attempt < tryLimit && placements.length - singletonDecorations.length < wantedDecorations.length; attempt += 1) {
      const decoration = wantedDecorations[placements.length - singletonDecorations.length];
      const x = -14 + rng() * (W + 28);
      const y = 40 + rng() * Math.max(1, totalHeight - 60);
      const width = 24 + rng() * 40;
      const height = width * (decoration.viewBoxHeight / decoration.viewBoxWidth);
      const rect: Rect = {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height,
        bottom: y,
      };

      const overlapsForbidden = forbiddenRects.some((forbidden) => rectsOverlap(rect, forbidden, 2));
      if (overlapsForbidden) continue;
      placements.push({
        svg: decoration.svg,
        category: decoration.category,
        left: x,
        top: y,
        width,
        height,
        flipX: rng() > 0.5,
      });
    }

    return placements;
  }, [W, totalHeight, items, numRows, kit, themedDecorations]);

  // ─── House placements (2 small houses anywhere except on the road) ───
  const housePlacements = useMemo(() => {
    if (W <= 0 || totalHeight <= 0 || items.length < 3) return [];
    const { trackLeft, trackRight } = getTrackMetrics(W);
    const seed = hashString(items.map((i) => i._id).join('~')) + W * 7 + 999;
    const rng = createSeededRandom(seed);

    // Forbidden: thin rects around horizontal road segments + vertical segments
    const roadPad = ROAD_BORDER / 2 + 10;
    const forbidden: Rect[] = [];
    for (let row = 0; row < numRows; row++) {
      const y = getRowY(row);
      // Horizontal segment at this row (thin vertical band)
      forbidden.push({ left: trackLeft - roadPad, right: trackRight + roadPad, top: y - roadPad, bottom: y + roadPad });
      // Vertical segment between this row and next
      if (row < numRows - 1) {
        const nextY = getRowY(row + 1);
        const x = row % 2 === 0 ? trackRight : trackLeft;
        forbidden.push({ left: x - roadPad, right: x + roadPad, top: y, bottom: nextY });
      }
    }
    // Station nodes
    for (let i = 0; i < items.length; i++) {
      const pos = getNodePosition(i, W);
      const r = NODE_SIZE / 2 + 20;
      forbidden.push({ left: pos.x - r, right: pos.x + r, top: pos.y - r, bottom: pos.y + r });
    }

    const houseSize = 45 + rng() * 15; // 45-60px (half of previous)
    const houseH = houseSize * 1.1;
    const result: Array<{ left: number; top: number; width: number; flipX: boolean }> = [];

    for (let attempt = 0; attempt < 800 && result.length < 2; attempt++) {
      const x = 20 + rng() * (W - 40);
      const y = PADDING_TOP + 20 + rng() * Math.max(1, totalHeight - PADDING_TOP - PADDING_BOTTOM);
      const rect: Rect = { left: x - houseSize / 2, right: x + houseSize / 2, top: y - houseH, bottom: y };

      if (forbidden.some((f) => rectsOverlap(rect, f, 4))) continue;
      if (result.some((h) => Math.hypot(h.left - x, h.top - y) < 140)) continue;

      result.push({ left: x, top: y, width: houseSize + rng() * 10, flipX: rng() > 0.5 });
    }
    return result;
  }, [W, totalHeight, items, numRows]);

  // ─── Animated fish ───
  const [fish, setFish] = useState<Array<{
    id: number; top: number; duration: number;
    wobbleDuration: number; size: number; palette: number;
  }>>([]);
  const fishIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showFish) return;
    const vh = window.innerHeight || 600;
    const interval = setInterval(() => {
      const roll = 1 + Math.floor(Math.random() * 2);
      const batch: typeof fish = [];
      for (let i = 0; i < roll; i++) {
        fishIdRef.current += 1;
        batch.push({
          id: fishIdRef.current,
          top: 60 + Math.random() * (vh - 120),
          duration: 7 + Math.random() * 6,
          wobbleDuration: 1.2 + Math.random() * 1.0,
          size: 36 + Math.random() * 28,
          palette: Math.floor(Math.random() * FISH_PALETTES.length),
        });
      }
      setFish((prev) => [...prev, ...batch]);
      const maxDur = Math.max(...batch.map((f) => f.duration));
      setTimeout(() => {
        const ids = new Set(batch.map((f) => f.id));
        setFish((prev) => prev.filter((f) => !ids.has(f.id)));
      }, (maxDur + 1) * 1000);
    }, 4000);

    return () => clearInterval(interval);
  }, [kit.showFish]);

  // ─── Drifting clouds (nature sky only): straight L→R, quick, max 2 on screen ───
  const [clouds, setClouds] = useState<Array<{ id: number; top: number; duration: number; size: number }>>([]);
  const cloudIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showClouds) {
      setClouds([]);
      return;
    }
    const vh = window.innerHeight || 600;
    const interval = setInterval(() => {
      setClouds((prev) => {
        if (prev.length >= 2) return prev;
        cloudIdRef.current += 1;
        const duration = 11 + Math.random() * 7;
        const top = 40 + Math.random() * Math.min(120, vh * 0.2);
        const size = 58 + Math.random() * 44;
        return [...prev, { id: cloudIdRef.current, top, duration, size }];
      });
    }, 3800);
    return () => clearInterval(interval);
  }, [kit.showClouds]);

  // ─── Animated tumbleweeds (desert) ───
  const [tumbleweeds, setTumbleweeds] = useState<Array<{
    id: number; top: number; duration: number;
    bounceDuration: number; spinDuration: number; size: number;
  }>>([]);
  const tumbleweedIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showTumbleweed) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.35) return;
      tumbleweedIdRef.current += 1;
      const vh = window.innerHeight || 600;
      const newTw = {
        id: tumbleweedIdRef.current,
        top: vh * 0.55 + Math.random() * vh * 0.3,
        duration: 5 + Math.random() * 4,
        bounceDuration: 0.5 + Math.random() * 0.3,
        spinDuration: 0.8 + Math.random() * 0.7,
        size: 45 + Math.random() * 30,
      };
      setTumbleweeds((prev) => [...prev, newTw]);
      setTimeout(() => {
        setTumbleweeds((prev) => prev.filter((tw) => tw.id !== newTw.id));
      }, (newTw.duration + 1) * 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, [kit.showTumbleweed]);

  // Snap-scroll to active station before first paint
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || W <= 0 || scrollAreaH <= 0) return;
    el.scrollTop = getCenteredScrollTop(currentItemIndex, W, scrollAreaH);
  }, [currentItemIndex, W, scrollAreaH, getCenteredScrollTop]);

  // Smooth-scroll to active station after footstep animation
  useEffect(() => {
    if (!showFootsteps) return;
    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (!el || W <= 0 || scrollAreaH <= 0) return;
      el.scrollTo({ top: getCenteredScrollTop(currentItemIndex, W, scrollAreaH), behavior: 'smooth' });
    }, 1800);
    return () => clearTimeout(t);
  }, [currentItemIndex, showFootsteps, W, scrollAreaH, getCenteredScrollTop]);

  useEffect(() => {
    if (!showFootsteps) return;
    footstepsTimerRef.current = setTimeout(onFootstepsComplete, 1800);
    return () => { if (footstepsTimerRef.current) clearTimeout(footstepsTimerRef.current); };
  }, [showFootsteps, onFootstepsComplete]);

  const getNodeState = useCallback(
    (index: number): 'completed' | 'active' | 'locked' => {
      if (index < completedCount)     return 'completed';
      if (index === currentItemIndex) return 'active';
      return 'locked';
    },
    [completedCount, currentItemIndex],
  );

  const themeVars: React.CSSProperties & Record<string, string> = {
    '--node-active-border': kit.nodeActiveBorder,
    '--node-active-bg': kit.nodeActiveBg,
    '--node-completed-border': kit.nodeCompletedBorder,
    '--node-completed-bg': kit.nodeCompletedBg,
    '--node-locked-border': kit.nodeLockedBorder,
    '--node-locked-bg': kit.nodeLockedBg,
    '--node-label-color': kit.nodeLabelColor,
    '--node-label-shadow': kit.nodeLabelShadow,
  } as React.CSSProperties & Record<string, string>;

  const header = (
    <GameHeader style={{
      position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
      background: 'transparent',
      boxShadow: 'none',
      borderBottom: '1px solid #DCDCDC',
    }}>
      <RoadmapHeaderTop>
        {groupName && <HeaderGroupName>{groupName}</HeaderGroupName>}
        <RoadmapHeaderButtonRow>
          <RoadmapHeaderItem>
            <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            <HelpChatHeaderButton />
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            {onViewLeaderboard ? (
              <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'}>
                <RoadmapHeaderTrophyIcon />
              </DarkHeaderActionIconButton>
            ) : (
              <RoadmapHeaderIconPlaceholder aria-hidden />
            )}
          </RoadmapHeaderItem>
          <RoadmapHeaderItem>
            <RoadmapHeaderPoints
              role="status"
              aria-label={`${currentPoints} ${t.points}`}
            >
              <RoadmapHeaderPointsValue>{currentPoints}</RoadmapHeaderPointsValue>
              <RoadmapHeaderPointsIcon />
            </RoadmapHeaderPoints>
          </RoadmapHeaderItem>
        </RoadmapHeaderButtonRow>
      </RoadmapHeaderTop>
    </GameHeader>
  );

  if (W <= 0) {
    return (
      <RoadmapContainer style={{ background: kit.containerBg, ...themeVars }}>
        {header}
        <ScrollArea ref={scrollRef}>
          <div ref={canvasRef} style={{ width: '100%', minHeight: '100dvh' }} />
        </ScrollArea>
      </RoadmapContainer>
    );
  }

  return (
    <RoadmapContainer style={{ background: kit.containerBg, ...themeVars }}>
      {header}

      <ScrollArea ref={scrollRef}>
        <PathCanvas
          ref={canvasRef}
          height={totalHeight}
          style={{ ['--roadmap-w' as string]: `${W}px` }}
        >
          <SceneBackground width={W} height={totalHeight} kit={kit} />
          <WorldDecorations W={W} numRows={numRows} totalH={totalHeight} />

          <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
            width={W} height={totalHeight} viewBox={`0 0 ${W} ${totalHeight}`}
            overflow="visible">
            <path d={svgPath} fill="none" stroke={kit.roadBorder}
              strokeWidth={ROAD_BORDER} strokeLinecap="round" strokeLinejoin="round" />
            <path d={svgPath} fill="none" stroke={kit.roadSurface}
              strokeWidth={ROAD_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
            <path d={svgPath} fill="none" stroke={kit.roadCenterLine}
              strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="20 24" />
          </svg>

          {/* Footsteps */}
          {showFootsteps && footstepPoints.map((pt, i) => (
            <FootprintEl key={`fp${i}`} style={{ left: pt.x, top: pt.y }}
              delay={i * 0.22} isRight={i % 2 === 1}>
              <FootprintSvg />
            </FootprintEl>
          ))}

          {treePlacements.map((placement, index) => (
            <TreeDecoration
              key={`tree-${index}`}
              aria-hidden
              style={{
                left: placement.left,
                top: placement.top,
                width: placement.width,
                height: placement.height,
                zIndex: ['Trees', 'Cactus', 'Coral', 'Seaweed'].includes(placement.category) ? 4
                  : ['Water', 'Bubbles'].includes(placement.category) ? 3 : 1,
                transform: placement.flipX ? 'translate(-50%, -100%) scaleX(-1)' : 'translate(-50%, -100%)',
                transformOrigin: 'center bottom',
              }}
              dangerouslySetInnerHTML={{ __html: placement.svg }}
            />

))}



          {kit.showHouses && housePlacements.map((h, i) => (
            <HouseDecoration
              key={`house-${i}`}
              src="/images/village-house.svg"
              alt=""
              aria-hidden
              style={{
                left: h.left,
                top: h.top,
                width: h.width,
                transform: `translate(-50%, -100%)${h.flipX ? ' scaleX(-1)' : ''}`,
                transformOrigin: 'center bottom',
              }}
            />
          ))}

          {kit.showSideWaves && sideWavePlacements.left.map((placement, index) => (
            <RoadsideWaveDecoration
              key={`left-wave-${index}`}
              src={theme === 'ocean' ? storySideWaveBlue : theme === 'desert' ? storySideWaveDesert : storySideWave}
              alt=""
              aria-hidden
              style={{
                left: placement.left,
                top: placement.top,
                width: placement.width,
                transform: 'translate(-50%, -50%) scaleX(-1)',
                transformOrigin: 'center',
              }}
            />
          ))}

          {kit.showSideWaves && sideWavePlacements.right.map((placement, index) => (
            <RoadsideWaveDecoration
              key={`right-wave-${index}`}
              src={theme === 'ocean' ? storySideWaveBlue : theme === 'desert' ? storySideWaveDesert : storySideWave}
              alt=""
              aria-hidden
              style={{
                left: placement.left,
                top: placement.top,
                width: placement.width,
                transform: 'translate(-50%, -50%)',
                transformOrigin: 'center',
              }}
            />
          ))}

          {/* Station nodes */}
          {items.map((item, index) => {
            const pos   = getNodePosition(index, W);
            const state = getNodeState(index);
            return (
              <div key={item._id}
                style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 10 }}
                ref={state === 'active' ? activeNodeRef : undefined}>
                <NodeWrapper state={state}
                  animateIn={state === 'completed' && index === completedCount - 1 && showFootsteps}
                  onClick={state === 'active' ? () => onNodeTap(index) : undefined}>
                  <NodeNumber state={state}>{index + 1}</NodeNumber>
                </NodeWrapper>
              </div>
            );
          })}

          {kit.showClouds && (
            <CloudSkyLayer aria-hidden>
              {clouds.map((c) => (
                <CloudOuter
                  key={`cloud-${c.id}`}
                  duration={c.duration}
                  top={c.top}
                  onAnimationEnd={() => {
                    setClouds((prev) => prev.filter((x) => x.id !== c.id));
                  }}
                >
                  <DriftingCloudSvg width={c.size} />
                </CloudOuter>
              ))}
            </CloudSkyLayer>
          )}
        </PathCanvas>
      </ScrollArea>

      {kit.showFish && fish.map((f) => (
        <FishOuter key={`fish-${f.id}`} duration={f.duration} top={f.top}>
          <FishWobbleWrap wobbleDuration={f.wobbleDuration}>
            <SwimmingFishSvg size={f.size} palette={f.palette} />
          </FishWobbleWrap>
        </FishOuter>
      ))}

      {kit.showTumbleweed && tumbleweeds.map((tw) => (
        <TumbleweedOuter key={`tw-${tw.id}`} duration={tw.duration} top={tw.top}>
          <TumbleweedBounceWrap bounceDuration={tw.bounceDuration}>
            <TumbleweedSpinWrap
              src="/images/tumbleweed.svg"
              alt=""
              aria-hidden
              spinDuration={tw.spinDuration}
              style={{ width: tw.size, height: tw.size }}
            />
          </TumbleweedBounceWrap>
        </TumbleweedOuter>
      ))}

      {popupModal}
    </RoadmapContainer>
  );
}
