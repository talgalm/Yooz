import { useLayoutEffect, useRef, useState, useMemo, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { DarkHeaderActionIconButton } from '../../components/styled';
import type { ModuleItemData, CustomThemeData } from './types';
import ActivitySessionHeader, { SessionHeaderTrophyIcon } from './ActivitySessionHeader';
import storySideWave from '../../assets/story-side-wave.svg';
import storySideWaveBlue from '../../assets/story-side-wave-blue.svg';
import storySideWaveDesert from '../../assets/story-side-wave-desert.svg';
import { ROADMAP_DECORATIONS } from './roadmapTrees';
import { getThemeKit, OCEAN_DECORATIONS, DESERT_DECORATIONS, type RoadmapThemeKit } from './roadmapThemes';

// ─── Constants ───

const NODE_SIZE = 90;
const SVG_SIZE = 110;
const MIN_DIST_PX = 140;
const EDGE_MARGIN = 65;

// ─── Seeded RNG helpers ───

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function createSeededRandom(seed: number) {
  let state = (seed || 1) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function generatePositions(
  count: number,
  containerW: number,
  containerH: number,
  seed: string,
): { x: number; y: number }[] {
  const rng = createSeededRandom(hashString(seed));
  const positions: { x: number; y: number }[] = [];
  const minX = EDGE_MARGIN;
  const maxX = containerW - EDGE_MARGIN;
  const minY = EDGE_MARGIN;
  const maxY = containerH - EDGE_MARGIN;

  for (let i = 0; i < count; i++) {
    let pos = { x: 0, y: 0 };
    let attempts = 0;
    do {
      pos = {
        x: minX + rng() * (maxX - minX),
        y: minY + rng() * (maxY - minY),
      };
      attempts++;
    } while (
      attempts < 200 &&
      positions.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < MIN_DIST_PX)
    );
    positions.push(pos);
  }
  return positions;
}

// ─── Inline SVG components (same as RoadmapView) ───

const FISH_PALETTES = [
  { body: '#FFB84D', fin: '#FF9E33', stripe: '#E89030' },
  { body: '#5ED4F5', fin: '#3BB8D8', stripe: '#2AA0C0' },
  { body: '#FF8FAB', fin: '#E86B8A', stripe: '#D05070' },
  { body: '#7BE87B', fin: '#50C850', stripe: '#38A838' },
  { body: '#C89BFF', fin: '#A070E8', stripe: '#8850D0' },
  { body: '#FFD966', fin: '#F0C030', stripe: '#D0A020' },
];

const DriftingCloudSvg = ({ width }: { width: number }) => (
  <svg width={width} height={width * 0.48} viewBox="0 0 100 48" aria-hidden
    style={{ display: 'block', opacity: 0.94, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.12))' }}>
    <ellipse cx="28" cy="30" rx="24" ry="15" fill="#fff" />
    <ellipse cx="50" cy="26" rx="30" ry="17" fill="#fff" />
    <ellipse cx="74" cy="30" rx="20" ry="13" fill="#fff" />
    <ellipse cx="42" cy="34" rx="18" ry="11" fill="#f8fafc" />
  </svg>
);

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

// ─── Animations ───

const fishSwim = keyframes`
  0%   { transform: translateX(-120px); }
  100% { transform: translateX(calc(100vw + 120px)); }
`;
const fishWobble = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%       { transform: translateY(-8px) rotate(-2deg); }
  75%       { transform: translateY(8px) rotate(2deg); }
`;
const cloudDrift = keyframes`
  0%   { transform: translateX(-140px); }
  100% { transform: translateX(calc(100vw + 140px)); }
`;
const tumbleweedDrift = keyframes`
  0%   { transform: translateX(-100px); }
  100% { transform: translateX(calc(100vw + 100px)); }
`;
const tumbleweedBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-28px); }
`;
const tumbleweedSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;
const completedBounce = keyframes`
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

// ─── Styled Components ───

const Container = styled('div')<{ bg?: string }>(({ bg }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  overflow: 'hidden',
  position: 'relative',
  background: bg || '#8fb247',
}));

const CanvasArea = styled('div')({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
});

const Canvas = styled('div')({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  position: 'relative',
  WebkitOverflowScrolling: 'touch',
  scrollbarGutter: 'stable',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255,255,255,0.85) rgba(0,0,0,0.25)',
  '&::-webkit-scrollbar': {
    width: 12,
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    border: '2px solid rgba(0,0,0,0.25)',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#fff',
  },
});

const CanvasInner = styled('div')<{ h: number }>(({ h }) => ({
  position: 'relative',
  width: '100%',
  height: h,
}));

// Custom always-visible scroll indicator overlay. Native mobile scrollbars
// auto-hide on Android, so we paint our own.
const ScrollIndicatorTrack = styled('div')({
  position: 'absolute',
  top: 8,
  bottom: 8,
  right: 4,
  width: 6,
  borderRadius: 4,
  background: 'rgba(0,0,0,0.25)',
  pointerEvents: 'none',
  zIndex: 50,
});

const ScrollIndicatorThumb = styled('div')({
  position: 'absolute',
  left: 0,
  width: '100%',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(0,0,0,0.3)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
  transition: 'top 60ms linear, height 60ms linear',
});

const NodeWrapper = styled('button')<{ completed?: boolean }>(({ completed }) => ({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  opacity: 1,
  filter: 'none',
  zIndex: completed ? 1 : 10,
  transition: 'opacity 0.3s, filter 0.3s',
  '&:active:not(:disabled)': {
    transform: 'translate(-50%, calc(-50% + 3px))',
  },
}));

const Circle = styled('div')<{ themeColor?: string }>(({ themeColor }) => ({
  width: NODE_SIZE,
  height: NODE_SIZE,
  borderRadius: '50%',
  background: themeColor
    ? `radial-gradient(circle at 38% 38%, ${themeColor}cc, ${themeColor})`
    : 'radial-gradient(circle at 38% 38%, #a78bfa, #6c5ce7)',
  border: '4px solid rgba(255,255,255,0.55)',
  boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  position: 'relative',
}));

const ItemNumber = styled('span')({
  fontSize: 24,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1,
  textShadow: '0 2px 4px rgba(0,0,0,0.35)',
  fontFamily: "'Rubik One', sans-serif",
  userSelect: 'none',
});

const SvgImg = styled('img')({
  width: SVG_SIZE,
  height: SVG_SIZE,
  objectFit: 'contain',
  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
  display: 'block',
});

const ItemLabel = styled('div')({
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  textAlign: 'center',
  maxWidth: 110,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)',
  userSelect: 'none',
});

const CompletedSvgBadge = styled('div')({
  position: 'absolute',
  top: -6,
  right: -6,
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#22c55e',
  border: '2.5px solid #fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  animation: `${completedBounce} 400ms cubic-bezier(0.34, 1.45, 0.64, 1) forwards`,
  zIndex: 3,
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
});

const StationNumberBadge = styled('div')({
  position: 'absolute',
  top: -6,
  right: -6,
  minWidth: 22,
  height: 22,
  borderRadius: 11,
  background: 'rgba(0,0,0,0.65)',
  border: '2px solid rgba(255,255,255,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  padding: '0 4px',
  zIndex: 4,
  pointerEvents: 'none',
});

const TreeDecoration = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
  opacity: 0.92,
  '& > svg': { width: '100%', height: '100%', display: 'block' },
});

const RoadsideWaveDecoration = styled('img')({
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 2,
  opacity: 0.85,
});

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
  animation: `${tumbleweedSpin} ${spinDuration}s linear infinite`,
}));

// ─── Scene gradient background ───

function SceneBackground({ width: W, height: H, kit }: { width: number; height: number; kit: RoadmapThemeKit }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spidersBgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={kit.sceneBgTop} />
          <stop offset="55%" stopColor={kit.sceneBgMid} />
          <stop offset="100%" stopColor={kit.sceneBgBottom} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#spidersBgGrad)" />
    </svg>
  );
}

// ─── Component ───

interface SpidersViewProps {
  items: ModuleItemData[];
  completedItemIndices: Set<number>;
  currentPoints: number;
  onNodeTap: (index: number) => void;
  onLogout: () => void;
  onViewLeaderboard: () => void;
  popupModal: React.ReactNode;
  t: Record<string, string>;
  theme?: string;
  customTheme?: CustomThemeData;
  showStationNumbers?: boolean;
  leaderboardMode?: 'points' | 'time';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
  finalItemIndex?: number;
  /** Manager-controlled progress lock: items with index >= this are blocked. */
  lockedFromIndex?: number | null;
}

export default function SpidersView({
  items,
  completedItemIndices,
  currentPoints,
  onNodeTap,
  onLogout,
  onViewLeaderboard,
  popupModal,
  t,
  theme,
  customTheme,
  showStationNumbers,
  leaderboardMode,
  elapsedSeconds,
  activityDurationMinutes,
  finalItemIndex,
  lockedFromIndex,
}: SpidersViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null);
  const [scrollState, setScrollState] = useState<{ thumbHeightPct: number; thumbTopPct: number; visible: boolean }>({
    thumbHeightPct: 0,
    thumbTopPct: 0,
    visible: false,
  });

  // Track scroll position to drive the custom always-visible scroll indicator.
  // Native scrollbars auto-hide on mobile (Android Chrome), so we render our own.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight + 1) {
        setScrollState((prev) => (prev.visible ? { thumbHeightPct: 0, thumbTopPct: 0, visible: false } : prev));
        return;
      }
      const heightPct = Math.max((clientHeight / scrollHeight) * 100, 8);
      const maxTopPct = 100 - heightPct;
      const topPct = Math.min((scrollTop / (scrollHeight - clientHeight)) * maxTopPct, maxTopPct);
      setScrollState({ thumbHeightPct: heightPct, thumbTopPct: topPct, visible: true });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) {
      ro.observe(el);
      if (canvasRef.current) ro.observe(canvasRef.current);
    }
    return () => {
      el.removeEventListener('scroll', update);
      if (ro) ro.disconnect();
    };
  }, [canvasSize]);

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const minH = Math.max(height, Math.ceil(items.length / 2) * 200 + EDGE_MARGIN * 2);
    setCanvasSize({ w: width, h: minH });
  }, [items.length]);

  const seed = useMemo(() => items.map((it) => it._id).join(''), [items]);
  const kit = useMemo(() => getThemeKit(theme), [theme]);

  const positions = useMemo(() => {
    if (!canvasSize) return [];
    return generatePositions(items.length, canvasSize.w, canvasSize.h, seed);
  }, [canvasSize, items.length, seed]);

  // ─── Tree / decoration placements ───
  const themedDecorations = useMemo(() => {
    if (theme === 'ocean') return OCEAN_DECORATIONS;
    if (theme === 'desert') return DESERT_DECORATIONS;
    return ROADMAP_DECORATIONS;
  }, [theme]);

  const treePlacements = useMemo(() => {
    if (!canvasSize || !positions.length || customTheme) return [];
    const { w: W, h: H } = canvasSize;
    const rng = createSeededRandom(hashString(seed) + 42);

    // Forbidden zones: around each item node
    const forbidden: Array<{ left: number; right: number; top: number; bottom: number }> = [
      ...positions.map((pos) => ({
        left: pos.x - NODE_SIZE * 0.7,
        right: pos.x + NODE_SIZE * 0.7,
        top: pos.y - NODE_SIZE * 0.7,
        bottom: pos.y + NODE_SIZE * 0.7,
      })),
    ];

    // Forbidden zones: around the two side waves
    // Wave SVG aspect ratio is 676×1260 ≈ 1.86 tall per unit of width
    if (kit.showSideWaves) {
      const wRng = createSeededRandom(hashString(seed) + 77);
      const waveW = 65 + wRng() * 20;
      const waveH = waveW * 1.86;
      const leftY  = H * 0.3 + wRng() * H * 0.25;
      const rightY = H * 0.3 + wRng() * H * 0.25;
      // Left wave hugs left edge, extends inward by waveW; add padding
      forbidden.push({ left: -10, right: waveW + 20, top: leftY  - waveH / 2 - 10, bottom: leftY  + waveH / 2 + 10 });
      // Right wave hugs right edge, extends inward by waveW; add padding
      forbidden.push({ left: W - waveW - 20, right: W + 10, top: rightY - waveH / 2 - 10, bottom: rightY + waveH / 2 + 10 });
    }

    const primaryCat = kit.decorationCategories[0] || 'Trees';
    const primary = themedDecorations.filter((d) => d.category === primaryCat);
    const others = themedDecorations.filter((d) => d.category !== primaryCat);
    const pool = [...primary, ...others];
    if (!pool.length) return [];

    const wantedCount = Math.min(items.length * 6 + 18, 55);
    const placements: Array<{
      svg: string; category: string;
      left: number; top: number; width: number; height: number; flipX: boolean;
    }> = [];

    for (let attempt = 0; attempt < 12000 && placements.length < wantedCount; attempt++) {
      const dec = pool[Math.floor(rng() * pool.length)];
      const w = 30 + rng() * 55;
      const h = w * (dec.viewBoxHeight / dec.viewBoxWidth);
      const x = 10 + rng() * (W - 20);
      const y = 40 + rng() * (H - 60);
      const rect = { left: x - w / 2, right: x + w / 2, top: y - h, bottom: y };

      if (forbidden.some((f) =>
        !(rect.right < f.left || rect.left > f.right || rect.bottom < f.top || rect.top > f.bottom)
      )) continue;

      placements.push({ svg: dec.svg, category: dec.category, left: x, top: y, width: w, height: h, flipX: rng() > 0.5 });
      forbidden.push(rect);
    }
    return placements;
  }, [canvasSize, positions, seed, themedDecorations, kit, items.length, customTheme]);

  // ─── Wave placements — exactly 1 left edge, 1 right edge ───
  const wavePlacements = useMemo(() => {
    if (!canvasSize || !kit.showSideWaves || customTheme) return [];
    const { w: W, h: H } = canvasSize;
    const rng = createSeededRandom(hashString(seed) + 77);
    const waveSize = 65 + rng() * 20;
    return [
      { x: 0,  y: H * 0.3 + rng() * H * 0.25, w: waveSize, side: 'left'  as const },
      { x: W,  y: H * 0.3 + rng() * H * 0.25, w: waveSize, side: 'right' as const },
    ];
  }, [canvasSize, seed, kit.showSideWaves, customTheme]);

  // ─── Animated fish ───
  const [fish, setFish] = useState<Array<{
    id: number; top: number; duration: number; wobbleDuration: number; size: number; palette: number;
  }>>([]);
  const fishIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showFish || customTheme) return;
    const interval = setInterval(() => {
      const roll = 1 + Math.floor(Math.random() * 2);
      const batch: typeof fish = [];
      const vh = window.innerHeight || 600;
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
  }, [kit.showFish, customTheme]);

  // ─── Drifting clouds ───
  const [clouds, setClouds] = useState<Array<{ id: number; top: number; duration: number; size: number }>>([]);
  const cloudIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showClouds || customTheme) { setClouds([]); return; }
    const vh = window.innerHeight || 600;
    const interval = setInterval(() => {
      setClouds((prev) => {
        if (prev.length >= 2) return prev;
        cloudIdRef.current += 1;
        return [...prev, {
          id: cloudIdRef.current,
          top: 40 + Math.random() * Math.min(120, vh * 0.2),
          duration: 11 + Math.random() * 7,
          size: 58 + Math.random() * 44,
        }];
      });
    }, 3800);
    return () => clearInterval(interval);
  }, [kit.showClouds, customTheme]);

  // ─── Animated tumbleweeds ───
  const [tumbleweeds, setTumbleweeds] = useState<Array<{
    id: number; top: number; duration: number;
    bounceDuration: number; spinDuration: number; size: number;
  }>>([]);
  const tumbleweedIdRef = useRef(0);

  useEffect(() => {
    if (!kit.showTumbleweed || customTheme) return;
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
  }, [kit.showTumbleweed, customTheme]);

  // ─── Derived values ───
  const containerBg: React.CSSProperties = customTheme?.roadmapImage
    ? { backgroundImage: `url(${customTheme.roadmapImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: kit.containerBg };

  const nodeColor = customTheme?.mainColor || '#6c5ce7';
  const waveImg = theme === 'ocean' ? storySideWaveBlue : theme === 'desert' ? storySideWaveDesert : storySideWave;
  const canvasH = canvasSize?.h ?? 600;
  const canvasW = canvasSize?.w ?? 0;

  return (
    <Container style={containerBg}>
      <ActivitySessionHeader
        currentPoints={currentPoints}
        pointsRoll={null}
        onPointsRollComplete={() => {}}
        onLogout={onLogout}
        t={t}
        leaderboardMode={leaderboardMode}
        elapsedSeconds={elapsedSeconds}
        activityDurationMinutes={activityDurationMinutes}
        thirdSlot={
          <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'}>
            <SessionHeaderTrophyIcon />
          </DarkHeaderActionIconButton>
        }
      />

      <CanvasArea>
        <Canvas ref={scrollContainerRef}>
          <CanvasInner ref={canvasRef} h={canvasH}>

          {/* Scene background gradient */}
          {!customTheme && canvasW > 0 && (
            <SceneBackground width={canvasW} height={canvasH} kit={kit} />
          )}

          {/* Static tree / decoration elements */}
          {treePlacements.map((p, i) => (
            <TreeDecoration
              key={`tree-${i}`}
              aria-hidden
              style={{
                left: p.left,
                top: p.top,
                width: p.width,
                height: p.height,
                zIndex: ['Trees', 'Cactus', 'Coral', 'Seaweed'].includes(p.category) ? 4
                  : ['Water', 'Bubbles'].includes(p.category) ? 3 : 1,
                transform: p.flipX ? 'translate(-50%, -100%) scaleX(-1)' : 'translate(-50%, -100%)',
                transformOrigin: 'center bottom',
              }}
              dangerouslySetInnerHTML={{ __html: p.svg }}
            />
          ))}

          {/* Side wave decorations — 1 left, 1 right */}
          {wavePlacements.map((w, i) => (
            <RoadsideWaveDecoration
              key={`wave-${i}`}
              src={waveImg}
              alt=""
              aria-hidden
              style={{
                left: w.side === 'left' ? 0 : undefined,
                right: w.side === 'right' ? 0 : undefined,
                top: w.y,
                width: w.w,
                transform: w.side === 'left' ? 'translateY(-50%) scaleX(-1)' : 'translateY(-50%)',
              }}
            />
          ))}

          {/* Drifting clouds (nature) */}
          {kit.showClouds && !customTheme && (
            <CloudSkyLayer aria-hidden>
              {clouds.map((c) => (
                <CloudOuter key={`cloud-${c.id}`} duration={c.duration} top={c.top}
                  onAnimationEnd={() => setClouds((prev) => prev.filter((x) => x.id !== c.id))}>
                  <DriftingCloudSvg width={c.size} />
                </CloudOuter>
              ))}
            </CloudSkyLayer>
          )}

          {/* Station / game nodes */}
          {positions.length > 0 && items.map((item, index) => {
            const pos = positions[index];
            if (!pos) return null;
            const completed = completedItemIndices.has(index);
            const hasSvg = Boolean(item.spiderSvg);
            const isFinalNode = finalItemIndex !== undefined && finalItemIndex === index;
            const nonFinalCount = finalItemIndex !== undefined ? items.length - 1 : items.length;
            const isFinalLocked = isFinalNode && completedItemIndices.size < nonFinalCount;
            const isManagerLocked = typeof lockedFromIndex === 'number' && index >= lockedFromIndex && !completed;
            const isLocked = isFinalLocked || isManagerLocked;

            return (
              <NodeWrapper
                key={item._id}
                style={{ left: pos.x, top: pos.y, opacity: isLocked ? 0.55 : 1, filter: isLocked ? 'grayscale(0.4)' : 'none' }}
                completed={completed}
                onClick={() => { if (!isManagerLocked) onNodeTap(index); }}
                aria-label={item.name}
              >
                {hasSvg ? (
                  <div style={{ position: 'relative' }}>
                    <SvgImg src={item.spiderSvg!} alt={item.name} />
                    {completed && <CompletedSvgBadge>✓</CompletedSvgBadge>}
                    {isLocked && !completed && (
                      <div style={{ position: 'absolute', top: -6, left: -6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '2px solid rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 4 }}>🔒</div>
                    )}
                    {showStationNumbers && <StationNumberBadge>{index + 1}</StationNumberBadge>}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Circle themeColor={nodeColor}>
                      {isLocked && !completed ? (
                        <span style={{ fontSize: 30 }}>🔒</span>
                      ) : (
                        <ItemNumber>{index + 1}</ItemNumber>
                      )}
                    </Circle>
                    {completed && <CompletedSvgBadge>✓</CompletedSvgBadge>}
                    {showStationNumbers && <StationNumberBadge>{index + 1}</StationNumberBadge>}
                  </div>
                )}
                <ItemLabel>{item.name}</ItemLabel>
              </NodeWrapper>
            );
          })}

          </CanvasInner>
        </Canvas>
        {scrollState.visible && (
          <ScrollIndicatorTrack aria-hidden>
            <ScrollIndicatorThumb
              style={{ top: `${scrollState.thumbTopPct}%`, height: `${scrollState.thumbHeightPct}%` }}
            />
          </ScrollIndicatorTrack>
        )}
      </CanvasArea>

      {/* Animated fish (ocean) — fixed, outside scroll */}
      {kit.showFish && !customTheme && fish.map((f) => (
        <FishOuter key={`fish-${f.id}`} duration={f.duration} top={f.top}>
          <FishWobbleWrap wobbleDuration={f.wobbleDuration}>
            <SwimmingFishSvg size={f.size} palette={f.palette} />
          </FishWobbleWrap>
        </FishOuter>
      ))}

      {/* Tumbleweeds (desert) — fixed, outside scroll */}
      {kit.showTumbleweed && !customTheme && tumbleweeds.map((tw) => (
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
    </Container>
  );
}
