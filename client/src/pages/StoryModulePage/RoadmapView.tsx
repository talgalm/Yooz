import React, { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { DarkHeaderActionIconButton } from '../../components/styled';
import type { ModuleItemData, CustomThemeData } from './types';
import ActivitySessionHeader, { SessionHeaderIconPlaceholder, SessionHeaderTrophyIcon } from './ActivitySessionHeader';
import storySideWave from '../../assets/story-side-wave.svg';
import storySideWaveBlue from '../../assets/story-side-wave-blue.svg';
import storySideWaveDesert from '../../assets/story-side-wave-desert.svg';
import { ROADMAP_DECORATIONS } from './roadmapTrees';
import { getThemeKit, getHeaderIconColor, NATURE_THEME, OCEAN_DECORATIONS, DESERT_DECORATIONS, type RoadmapThemeKit } from './roadmapThemes';

const NODE_SIZE = 80;
const VERTICAL_SPACING = 190;
const PADDING_TOP = 80;
const PADDING_BOTTOM = 100;
const TRACK_LEFT_PCT = 12;
const TRACK_RIGHT_PCT = 88;
const NODE_LEFT_PCT = 24;
const NODE_RIGHT_PCT = 76;
const ROAD_WIDTH = 11;
const ROAD_BORDER = 16;

const pulse = keyframes`
  0%, 100% {
    transform: translate(-50%,-50%) scale(1);
    box-shadow: 0 4px 14px rgba(0,0,0,.3), 0 0 0 0 var(--node-active-border), 0 0 18px 2px var(--node-active-border);
  }
  50% {
    transform: translate(-50%,-50%) scale(1.15);
    box-shadow: 0 6px 26px rgba(0,0,0,.42), 0 0 0 14px rgba(255,255,255,0), 0 0 36px 10px var(--node-active-border);
  }
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
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 120px)); }
`;
const airplaneFly = keyframes`
  0%   { transform: translateX(-160px); }
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 160px)); }
`;
const airplaneWobble = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%      { transform: translateY(-6px) rotate(-2deg); }
  75%      { transform: translateY(6px) rotate(2deg); }
`;
const cloudDrift = keyframes`
  0%   { transform: translateX(-140px); }
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 140px)); }
`;
const fishWobble = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%      { transform: translateY(-8px) rotate(-2deg); }
  75%      { transform: translateY(8px) rotate(2deg); }
`;
const balloonFly = keyframes`
  0%   { transform: translateX(-180px); }
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 180px)); }
`;
const balloonWobble = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%      { transform: translateY(-10px) rotate(-1.5deg); }
  75%      { transform: translateY(10px) rotate(1.5deg); }
`;
const tumbleweedDrift = keyframes`
  0%   { transform: translateX(-100px); }
  100% { transform: translateX(calc(var(--roadmap-w, 100vw) + 100px)); }
`;
const tumbleweedBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-28px); }
`;
const tumbleweedSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const RoadmapContainer = styled('div')({
  display: 'flex', flexDirection: 'column', height: '100svh',
  overflow: 'hidden',
  contain: 'paint',
});

const RoadmapActivityName = styled('div')({
  flexShrink: 0,
  padding: '0 16px 10px',
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.3,
  color: '#1a1a1a',
  textAlign: 'center',
  userSelect: 'none',
  '@media (min-width: 768px)': {
    padding: '0 max(16px, calc((100% - 960px) / 2)) 14px',
    fontSize: 32,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
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

const NodeWrapper = styled('div')<{ state: 'completed' | 'active' | 'locked'; animateIn?: boolean; revisit?: boolean }>(
  ({ state, animateIn, revisit }) => ({
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: '50%',
    transform: 'translate(-50%,-50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: state === 'active' ? 'pointer' : 'default',
    zIndex: 10,
    border: `${state === 'active' ? 8 : 5}px solid var(--node-${state}-border)`,
    background: `var(--node-${state}-bg)`,
    boxShadow: state === 'active' ? '0 6px 20px rgba(0,0,0,.3)' : '0 4px 12px rgba(0,0,0,.2)',
    ...(revisit && {
      filter: 'saturate(1.5) brightness(1.18)',
      boxShadow: '0 0 0 3px rgba(255,255,255,.6), 0 4px 14px rgba(0,0,0,.25)',
    }),
    animation: state === 'active'
      ? `${pulse} 1.4s ease-in-out infinite`
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

const lockPopIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const ManagerLockBadge = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.75)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  border: '2px solid #fff',
  zIndex: 12,
  animation: `${lockPopIn} 220ms ease-out`,
});

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

const BackgroundScenery = styled('img')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  opacity: 0.9,
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

const AirplaneOuter = styled('div')<{ duration: number; top: number }>(({ duration, top }) => ({
  position: 'fixed',
  left: 0,
  top,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 50,
  animation: `${airplaneFly} ${duration}s linear forwards`,
}));

const AirplaneWobbleWrap = styled('div')<{ wobbleDuration: number }>(({ wobbleDuration }) => ({
  animation: `${airplaneWobble} ${wobbleDuration}s ease-in-out infinite`,
}));


const PaperAirplaneSvg = ({ size }: { size: number }) => (
  <img
    src="/images/paper-airplane.svg"
    alt=""
    aria-hidden
    style={{
      display: 'block',
      width: size,
      height: size * (368 / 506),
      filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.18))',
      transform: 'rotate(-18deg)',
    }}
  />
);

const FishWobbleWrap = styled('div')<{ wobbleDuration: number }>(({ wobbleDuration }) => ({
  animation: `${fishWobble} ${wobbleDuration}s ease-in-out infinite`,
}));

const BalloonOuter = styled('div')<{ duration: number; top: number }>(({ duration, top }) => ({
  position: 'fixed',
  left: 0,
  top,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 50,
  animation: `${balloonFly} ${duration}s linear forwards`,
}));

const BalloonWobbleWrap = styled('div')<{ wobbleDuration: number }>(({ wobbleDuration }) => ({
  animation: `${balloonWobble} ${wobbleDuration}s ease-in-out infinite`,
}));

const BalloonSvg = ({ size }: { size: number }) => (
  <img
    src="/images/roadmap-balloon.png"
    alt=""
    aria-hidden
    style={{
      display: 'block',
      width: size,
      height: 'auto',
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.18))',
    }}
  />
);

const CloudSkyLayer = styled('div')({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: 280,
  overflow: 'hidden',
  pointerEvents: 'none',
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

function SceneBackground({ width: W, height: H, kit }: { width: number; height: number; kit: RoadmapThemeKit }) {
  const gridSize = kit.gridSize || 32;
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={kit.sceneBgTop} />
          <stop offset="55%" stopColor={kit.sceneBgMid} />
          <stop offset="100%" stopColor={kit.sceneBgBottom} />
        </linearGradient>
        {kit.showGridPattern && (
          <pattern id="officeGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={kit.gridLineColor || 'rgba(0,0,0,0.1)'}
              strokeWidth={1}
            />
          </pattern>
        )}
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#bgGrad)" />
      {kit.showGridPattern && (
        <rect x="0" y="0" width={W} height={H} fill="url(#officeGrid)" />
      )}
    </svg>
  );
}

function WorldDecorations(_: { W: number; numRows: number; totalH: number }) {
  return null;
}

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

interface RoadmapViewProps {
  items: ModuleItemData[];
  currentItemIndex: number;
  completedCount: number;
  currentPoints: number;
  pointsRoll?: { from: number; to: number } | null;
  onPointsRollComplete?: () => void;
  showFootsteps: boolean;
  onFootstepsComplete: () => void;
  onNodeTap: (index: number) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  hideLeaderboardInHeader?: boolean;
  popupModal: React.ReactNode;
  t: Record<string, string>;
  theme?: string;
  customTheme?: CustomThemeData;
  leaderboardMode?: 'points' | 'time' | 'both';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number;
  lockedFromIndex?: number | null;
  activityNameOnRoadmap?: string;
}

export default function RoadmapView({
  items, currentItemIndex, completedCount, currentPoints, pointsRoll, onPointsRollComplete,
  showFootsteps, onFootstepsComplete, onNodeTap, onLogout, onViewLeaderboard, hideLeaderboardInHeader, popupModal, t, theme, customTheme,
  leaderboardMode, elapsedSeconds, activityDurationMinutes, roadmapTimerMinutes, lockedFromIndex, activityNameOnRoadmap,
}: RoadmapViewProps) {
  const kit = useMemo(() => getThemeKit(theme), [theme]);
  const headerIconColor = useMemo(() => getHeaderIconColor(theme, customTheme), [theme, customTheme]);
  const activeNodeColor = customTheme?.roadmapActiveNodeColor || NATURE_THEME.nodeActiveBg;
  const pathColor = customTheme?.roadmapPathColor || NATURE_THEME.roadSurface;
  const containerBg: React.CSSProperties = customTheme?.roadmapImage
    ? { backgroundImage: `url(${customTheme.roadmapImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: kit.containerBg };
  const scrollRef   = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);
  const footstepsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeSeedRef = useRef(Math.floor(Math.random() * 2147483646) + 1);

  const [W, setW]               = useState(0);
  const [scrollAreaH, setScrollAreaH] = useState(0);

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

    for (let start = 0; start + 2 < items.length; start += 3) {
      const from = getNodePosition(start, W);
      const to = getNodePosition(start + 2, W);
      left.push({
        left: Math.max(10, W * 0.17),
        top: (from.y + to.y) / 2,
        width: Math.max(52, W * 0.34),
      });
    }

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
    if (kit.decorationCategories.length === 0) return [];
    if (theme === 'ganei-yehoshua') {
      return ROADMAP_DECORATIONS.filter((d) => d.category !== 'Bushes');
    }
    return ROADMAP_DECORATIONS;
  }, [theme, kit.decorationCategories]);

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
    const isGanei = theme === 'ganei-yehoshua';
    const wantedPrimaryCount = primaryDecorations.length > 0 ? (isGanei ? 18 : 30) : 0;
    const wantedOtherCount = otherDecorations.length > 0 ? (isGanei ? 24 : 40) : 0;

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
  }, [W, totalHeight, items, numRows, kit, themedDecorations, theme]);

  const housePlacements = useMemo(() => {
    if (W <= 0 || totalHeight <= 0 || items.length < 3) return [];
    const { trackLeft, trackRight } = getTrackMetrics(W);
    const seed = hashString(items.map((i) => i._id).join('~')) + W * 7 + 999;
    const rng = createSeededRandom(seed);

    const roadPad = ROAD_BORDER / 2 + 10;
    const forbidden: Rect[] = [];
    for (let row = 0; row < numRows; row++) {
      const y = getRowY(row);
      forbidden.push({ left: trackLeft - roadPad, right: trackRight + roadPad, top: y - roadPad, bottom: y + roadPad });
      if (row < numRows - 1) {
        const nextY = getRowY(row + 1);
        const x = row % 2 === 0 ? trackRight : trackLeft;
        forbidden.push({ left: x - roadPad, right: x + roadPad, top: y, bottom: nextY });
      }
    }
    for (let i = 0; i < items.length; i++) {
      const pos = getNodePosition(i, W);
      const r = NODE_SIZE / 2 + 20;
      forbidden.push({ left: pos.x - r, right: pos.x + r, top: pos.y - r, bottom: pos.y + r });
    }

    const houseSize = 45 + rng() * 15;
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

  const ganeiYehoshuaFixedTrees = useMemo(() => {
    if (theme !== 'ganei-yehoshua' || W <= 0 || totalHeight <= 0) {
      return [] as Array<{ svg: string; left: number; top: number; width: number; height: number; flipX: boolean }>;
    }
    const tree = ROADMAP_DECORATIONS.find((d) => d.name === 'Tall dark green tree');
    if (!tree) return [];

    const baseW = 52;
    const baseH = baseW * (tree.viewBoxHeight / tree.viewBoxWidth);
    const trees: Array<{ svg: string; left: number; top: number; width: number; height: number; flipX: boolean }> = [];

    const topY = 55;
    trees.push({ svg: tree.svg, left: W * 0.08, top: topY, width: baseW, height: baseH, flipX: false });
    trees.push({ svg: tree.svg, left: W * 0.5, top: topY + 8, width: baseW * 0.9, height: baseH * 0.9, flipX: true });
    trees.push({ svg: tree.svg, left: W * 0.92, top: topY, width: baseW, height: baseH, flipX: true });

    const bottomY = totalHeight - 25;
    trees.push({ svg: tree.svg, left: W * 0.08, top: bottomY, width: baseW, height: baseH, flipX: true });
    trees.push({ svg: tree.svg, left: W * 0.5, top: bottomY - 8, width: baseW * 0.9, height: baseH * 0.9, flipX: false });
    trees.push({ svg: tree.svg, left: W * 0.92, top: bottomY, width: baseW, height: baseH, flipX: false });

    return trees;
  }, [theme, W, totalHeight]);

  const ganeiYehoshuaScenery = useMemo(() => {
    if (theme !== 'ganei-yehoshua' || W <= 0 || totalHeight <= 0) {
      return [] as Array<{ src: string; left: number; top: number; width: number; height: number }>;
    }
    const ropesW = Math.min(W * 0.42, 200);
    const ropesH = ropesW * (500 / 680);
    const lakeW = Math.min(W * 0.5, 220);
    const lakeH = lakeW * (320 / 680);

    const ropesTop = PADDING_TOP + 15;
    const ropesLeft = W * 0.28;

    const lakeTop = Math.max(
      getRowY(1) + (VERTICAL_SPACING - lakeH) / 2,
      totalHeight - PADDING_BOTTOM - lakeH - 12,
    );

    return [
      {
        src: '/images/ganei-yehoshua-ropes.svg',
        left: ropesLeft,
        top: ropesTop,
        width: ropesW,
        height: ropesH,
      },
      {
        src: '/images/ganei-yehoshua-lake.svg',
        left: W - lakeW - 8,
        top: lakeTop,
        width: lakeW,
        height: lakeH,
      },
    ];
  }, [theme, W, totalHeight, items.length]);

  const officeItemPlacements = useMemo(() => {
    if (theme !== 'office' || W <= 0 || totalHeight <= 0 || items.length < 1) {
      return [] as Array<{ src: string; left: number; top: number; width: number; height: number }>;
    }
    const seed = hashString(items.map((i) => i._id).join('!')) + W * 13 + 4242;
    const rng = createSeededRandom(seed);

    const { trackLeft, trackRight } = getTrackMetrics(W);
    const roadPad = ROAD_BORDER / 2 + 4;
    const forbidden: Rect[] = [];
    for (let row = 0; row < numRows; row += 1) {
      const y = getRowY(row);
      forbidden.push({ left: trackLeft - roadPad, right: trackRight + roadPad, top: y - roadPad, bottom: y + roadPad });
      if (row < numRows - 1) {
        const nextY = getRowY(row + 1);
        const x = row % 2 === 0 ? trackRight : trackLeft;
        forbidden.push({ left: x - roadPad, right: x + roadPad, top: y, bottom: nextY });
      }
    }
    for (let i = 0; i < items.length; i += 1) {
      const pos = getNodePosition(i, W);
      const r = NODE_SIZE / 2 + 6;
      forbidden.push({ left: pos.x - r, right: pos.x + r, top: pos.y - r, bottom: pos.y + r });
    }

    const stationFactor = Math.max(1, items.length / 5);
    const itemSpecs: Array<{ src: string; count: number; width: number; ratio: number }> = [
      { src: '/images/office/desk_chair_no_bg.svg', count: Math.round(7 * stationFactor), width: 92, ratio: 1 },
      { src: '/images/office/desk-laptop.svg',     count: Math.round(5 * stationFactor), width: 92, ratio: 140 / 120 },
      { src: '/images/office/file-cabinet.svg',    count: Math.round(4 * stationFactor), width: 50, ratio: 90 / 70 },
      { src: '/images/office/plant-fiddle-leaf.svg', count: Math.max(1, Math.round(1 * stationFactor)), width: 56, ratio: 110 / 80 },
      { src: '/images/office/plant-snake.svg',     count: Math.max(2, Math.round(2 * stationFactor)), width: 38, ratio: 80 / 60 },
      { src: '/images/office/water_cooler_filing_cabinet.svg', count: Math.round(3 * stationFactor), width: 78, ratio: 1 },
    ];

    const queue: Array<{ src: string; width: number; ratio: number }> = [];
    for (const spec of itemSpecs) {
      for (let n = 0; n < spec.count; n += 1) {
        queue.push({ src: spec.src, width: spec.width, ratio: spec.ratio });
      }
    }
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    const result: Array<{ src: string; left: number; top: number; width: number; height: number }> = [];

    for (const item of queue) {
      const w = item.width + (rng() - 0.5) * 10;
      const h = w * item.ratio;
      let placed = false;
      for (let attempt = 0; attempt < 1500 && !placed; attempt += 1) {
        const x = 8 + rng() * Math.max(1, W - 16);
        const y = PADDING_TOP + 16 + rng() * Math.max(1, totalHeight - PADDING_TOP - PADDING_BOTTOM - 12);
        const rect: Rect = { left: x - w / 2, right: x + w / 2, top: y - h, bottom: y };
        if (forbidden.some((f) => rectsOverlap(rect, f, 2))) continue;
        result.push({ src: item.src, left: x, top: y, width: w, height: h });
        forbidden.push(rect);
        placed = true;
      }
    }

    return result;
  }, [theme, W, totalHeight, items, numRows]);

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

  const [airplanes, setAirplanes] = useState<Array<{
    id: number; top: number; duration: number;
    wobbleDuration: number; size: number;
  }>>([]);
  const airplaneIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showAirplane) return;
    const vh = window.innerHeight || 600;
    const interval = setInterval(() => {
      airplaneIdRef.current += 1;
      const newPlane = {
        id: airplaneIdRef.current,
        top: 80 + Math.random() * (vh - 200),
        duration: 8 + Math.random() * 5,
        wobbleDuration: 1.6 + Math.random() * 1.0,
        size: 50 + Math.random() * 20,
      };
      setAirplanes((prev) => [...prev, newPlane]);
      setTimeout(() => {
        setAirplanes((prev) => prev.filter((a) => a.id !== newPlane.id));
      }, (newPlane.duration + 1) * 1000);
    }, 4500);

    return () => clearInterval(interval);
  }, [kit.showAirplane]);

  const [balloons, setBalloons] = useState<Array<{
    id: number; top: number; duration: number;
    wobbleDuration: number; size: number;
  }>>([]);
  const balloonIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showBalloon) return;
    const vh = window.innerHeight || 600;
    const interval = setInterval(() => {
      setBalloons((prev) => {
        if (prev.length >= 2) return prev;
        balloonIdRef.current += 1;
        const newBalloon = {
          id: balloonIdRef.current,
          top: 40 + Math.random() * Math.min(vh * 0.45, 320),
          duration: 12 + Math.random() * 7,
          wobbleDuration: 2.2 + Math.random() * 1.4,
          size: 62 + Math.random() * 34,
        };
        setTimeout(() => {
          setBalloons((cur) => cur.filter((b) => b.id !== newBalloon.id));
        }, (newBalloon.duration + 1) * 1000);
        return [...prev, newBalloon];
      });
    }, 4200);

    return () => clearInterval(interval);
  }, [kit.showBalloon]);

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

  const centerScrollRef = useRef(getCenteredScrollTop);
  centerScrollRef.current = getCenteredScrollTop;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || W <= 0 || el.clientHeight <= 0) return;
    el.scrollTop = centerScrollRef.current(currentItemIndex, W, el.clientHeight);
  }, [currentItemIndex, W]);

  useEffect(() => {
    if (!showFootsteps) return;
    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (!el || W <= 0 || el.clientHeight <= 0) return;
      el.scrollTo({ top: centerScrollRef.current(currentItemIndex, W, el.clientHeight), behavior: 'smooth' });
    }, 1800);
    return () => clearTimeout(t);
  }, [currentItemIndex, showFootsteps, W]);

  useEffect(() => {
    if (!showFootsteps) return;
    footstepsTimerRef.current = setTimeout(onFootstepsComplete, 1800);
    return () => { if (footstepsTimerRef.current) clearTimeout(footstepsTimerRef.current); };
  }, [showFootsteps, onFootstepsComplete]);

  const isManagerLocked = useCallback(
    (index: number): boolean =>
      typeof lockedFromIndex === 'number' && index >= lockedFromIndex,
    [lockedFromIndex],
  );

  const tapStartRef = useRef<{ x: number; y: number; index: number } | null>(null);
  const tapHandledRef = useRef(false);
  const TAP_SLOP_PX = 10;

  const nodeTapProps = (index: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      tapStartRef.current = { x: e.clientX, y: e.clientY, index };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const start = tapStartRef.current;
      tapStartRef.current = null;
      if (!start || start.index !== index) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return;
      tapHandledRef.current = true;
      onNodeTap(index);
    },
    onClick: () => {
      if (tapHandledRef.current) {
        tapHandledRef.current = false;
        return;
      }
      onNodeTap(index);
    },
  });

  const getNodeState = useCallback(
    (index: number): 'completed' | 'active' | 'locked' => {
      if (index < completedCount)               return 'completed';
      if (isManagerLocked(index))               return 'locked';
      if (index === currentItemIndex)           return 'active';
      return 'locked';
    },
    [completedCount, currentItemIndex, isManagerLocked],
  );

  const themeVars: React.CSSProperties & Record<string, string> = {
    '--node-active-border': customTheme?.roadmapActiveNodeColor || kit.nodeActiveBorder,
    '--node-active-bg': activeNodeColor,
    '--node-completed-border': kit.nodeCompletedBorder,
    '--node-completed-bg': kit.nodeCompletedBg,
    '--node-locked-border': kit.nodeLockedBorder,
    '--node-locked-bg': kit.nodeLockedBg,
    '--node-label-color': kit.nodeLabelColor,
    '--node-label-shadow': kit.nodeLabelShadow,
  } as React.CSSProperties & Record<string, string>;

  const header = (
    <ActivitySessionHeader
      onLogout={onLogout}
      currentPoints={currentPoints}
      pointsRoll={pointsRoll}
      onPointsRollComplete={onPointsRollComplete}
      leaderboardMode={leaderboardMode}
      elapsedSeconds={elapsedSeconds}
      activityDurationMinutes={activityDurationMinutes}
      roadmapTimerMinutes={roadmapTimerMinutes}
      t={t}
      headerIconColor={headerIconColor}
      omitThirdSlot={hideLeaderboardInHeader}
      thirdSlot={!hideLeaderboardInHeader && onViewLeaderboard ? (
        <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'} iconColor={headerIconColor}>
          <SessionHeaderTrophyIcon />
        </DarkHeaderActionIconButton>
      ) : (
        <SessionHeaderIconPlaceholder aria-hidden />
      )}
    />
  );

  if (W <= 0) {
    return (
      <RoadmapContainer style={{ ...containerBg, ...themeVars }}>
        {header}
        {activityNameOnRoadmap ? (
          <RoadmapActivityName>{activityNameOnRoadmap}</RoadmapActivityName>
        ) : null}
        <ScrollArea ref={scrollRef}>
          <div ref={canvasRef} style={{ width: '100%', minHeight: '100svh' }} />
        </ScrollArea>
      </RoadmapContainer>
    );
  }

  return (
    <RoadmapContainer style={{ ...containerBg, ...themeVars }}>
      {header}
      {activityNameOnRoadmap ? (
        <RoadmapActivityName>{activityNameOnRoadmap}</RoadmapActivityName>
      ) : null}

      <ScrollArea ref={scrollRef}>
        <PathCanvas
          ref={canvasRef}
          height={totalHeight}
          style={{ ['--roadmap-w' as string]: `${W}px` }}
        >
          {!customTheme?.roadmapImage && <SceneBackground width={W} height={totalHeight} kit={kit} />}
          {!customTheme?.roadmapImage && <WorldDecorations W={W} numRows={numRows} totalH={totalHeight} />}

          {!customTheme?.roadmapImage && ganeiYehoshuaScenery.map((s) => (
            <BackgroundScenery
              key={s.src}
              src={s.src}
              alt=""
              aria-hidden
              style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
            />
          ))}

          {!kit.hideRoad && (
            <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
              width={W} height={totalHeight} viewBox={`0 0 ${W} ${totalHeight}`}
              overflow="visible">
              <path d={svgPath} fill="none" stroke={kit.roadBorder}
                strokeWidth={ROAD_BORDER} strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPath} fill="none" stroke={pathColor}
                strokeWidth={ROAD_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPath} fill="none" stroke={kit.roadCenterLine}
                strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="20 24" />
            </svg>
          )}

          {showFootsteps && footstepPoints.map((pt, i) => (
            <FootprintEl key={`fp${i}`} style={{ left: pt.x, top: pt.y }}
              delay={i * 0.22} isRight={i % 2 === 1}>
              <FootprintSvg />
            </FootprintEl>
          ))}

          {!customTheme?.roadmapImage && treePlacements.map((placement, index) => (
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

          {!customTheme?.roadmapImage && ganeiYehoshuaFixedTrees.map((p, i) => (
            <TreeDecoration
              key={`ganei-tree-${i}`}
              aria-hidden
              style={{
                left: p.left,
                top: p.top,
                width: p.width,
                height: p.height,
                zIndex: 4,
                transform: p.flipX ? 'translate(-50%, -100%) scaleX(-1)' : 'translate(-50%, -100%)',
                transformOrigin: 'center bottom',
              }}
              dangerouslySetInnerHTML={{ __html: p.svg }}
            />
          ))}

          {!customTheme?.roadmapImage && kit.showHouses && housePlacements.map((h, i) => (
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

          {!customTheme?.roadmapImage && officeItemPlacements.map((o, i) => (
            <HouseDecoration
              key={`office-${i}`}
              src={o.src}
              alt=""
              aria-hidden
              style={{
                left: o.left,
                top: o.top,
                width: o.width,
                height: o.height,
                transform: 'translate(-50%, -100%)',
                transformOrigin: 'center bottom',
              }}
            />
          ))}

          {!customTheme?.roadmapImage && kit.showSideWaves && sideWavePlacements.left.map((placement, index) => (
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

          {!customTheme?.roadmapImage && kit.showSideWaves && sideWavePlacements.right.map((placement, index) => (
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

          {!customTheme?.roadmapImage && kit.showClouds && (
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

          {items.map((item, index) => {
            const pos   = getNodePosition(index, W);
            const state = getNodeState(index);
            const managerLocked = state === 'locked' && isManagerLocked(index);
            const canRevisit = state === 'completed' && !!item.revisitable && !isManagerLocked(index);
            return (
              <div key={item._id}
                style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 10 }}
                ref={state === 'active' ? activeNodeRef : undefined}>
                <NodeWrapper state={state}
                  revisit={canRevisit}
                  animateIn={state === 'completed' && index === completedCount - 1 && showFootsteps}
                  style={canRevisit ? { cursor: 'pointer' } : undefined}
                  {...(state === 'active' || canRevisit ? nodeTapProps(index) : {})}>
                  <NodeNumber state={state}>{index + 1}</NodeNumber>
                  {managerLocked && (
                    <ManagerLockBadge aria-label="locked by manager" title="Locked by manager">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </ManagerLockBadge>
                  )}
                </NodeWrapper>
              </div>
            );
          })}

        </PathCanvas>
      </ScrollArea>

      {!customTheme?.roadmapImage && kit.showFish && fish.map((f) => (
        <FishOuter key={`fish-${f.id}`} duration={f.duration} top={f.top}>
          <FishWobbleWrap wobbleDuration={f.wobbleDuration}>
            <SwimmingFishSvg size={f.size} palette={f.palette} />
          </FishWobbleWrap>
        </FishOuter>
      ))}

      {!customTheme?.roadmapImage && kit.showAirplane && airplanes.map((a) => (
        <AirplaneOuter key={`plane-${a.id}`} duration={a.duration} top={a.top}>
          <AirplaneWobbleWrap wobbleDuration={a.wobbleDuration}>
            <PaperAirplaneSvg size={a.size} />
          </AirplaneWobbleWrap>
        </AirplaneOuter>
      ))}

      {!customTheme?.roadmapImage && kit.showBalloon && balloons.map((b) => (
        <BalloonOuter key={`balloon-${b.id}`} duration={b.duration} top={b.top}>
          <BalloonWobbleWrap wobbleDuration={b.wobbleDuration}>
            <BalloonSvg size={b.size} />
          </BalloonWobbleWrap>
        </BalloonOuter>
      ))}

      {!customTheme?.roadmapImage && kit.showTumbleweed && tumbleweeds.map((tw) => (
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
