import React, { useEffect, useRef, useState, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { ThemedSceneOverlayContext } from '../context/themedSceneOverlayContext';

// ─── Layout constants (same as roadmap) ───

const SKY_TOP = 190;
const BOTTOM_ZONE = 240;

// ─── Styled ───

const Wrapper = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const ContentLayer = styled('div')({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

// ─── Scene SVG (matching roadmap SceneBackground exactly) ───

function SceneSvg({ W, H }: { W: number; H: number }) {
  const B = H - BOTTOM_ZONE;

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {/* ── Defs ── */}
      <defs>
        <filter id="nbTreeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#00000022" />
        </filter>
        <filter id="nbTreeShadowSm" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000018" />
        </filter>
      </defs>

      {/* ── Sky ── */}
      <rect x="0" y="0" width={W} height={SKY_TOP + 40} fill="#b8e8f0" />

      {/* ── Main green field ── */}
      <rect x="0" y={SKY_TOP - 30} width={W} height={H - SKY_TOP + 30} fill="#9cd060" />

      {/* ── Clouds ── */}
      <g opacity="0.85">
        <ellipse cx={W * 0.23} cy={55} rx={28} ry={12} fill="#fff" />
        <ellipse cx={W * 0.17} cy={55} rx={18} ry={10} fill="#fff" />
        <ellipse cx={W * 0.30} cy={55} rx={18} ry={10} fill="#fff" />
      </g>
      <g opacity="0.85">
        <ellipse cx={W * 0.71} cy={38} rx={22} ry={9} fill="#fff" />
        <ellipse cx={W * 0.65} cy={38} rx={14} ry={8} fill="#fff" />
        <ellipse cx={W * 0.77} cy={38} rx={14} ry={8} fill="#fff" />
      </g>

      {/* ── Back hill (far) ── */}
      <ellipse cx={W * 0.5} cy={160} rx={W * 0.85} ry={100} fill="#8ecf72" />

      {/* ── Mid hills ── */}
      <ellipse cx={W * 0.19} cy={190} rx={W * 0.55} ry={80} fill="#79bf60" />
      <ellipse cx={W * 0.88} cy={185} rx={W * 0.50} ry={75} fill="#6db852" />

      {/* ── Front ground ── */}
      <ellipse cx={W * 0.5} cy={SKY_TOP + 30} rx={W * 0.77} ry={40} fill="#5aaa48" />

      {/* ── Trees on the hills ── */}

      {/* BIG RED round tree — left */}
      <g transform={`translate(${W * 0.05}, 84)`} filter="url(#nbTreeShadow)">
        <rect x="13" y="54" width="10" height="18" rx="4" fill="#7a4a28" />
        <ellipse cx="18" cy="62" rx="20" ry="6" fill="#00000015" />
        <circle cx="18" cy="44" r="22" fill="#cc5a4a" />
        <circle cx="18" cy="34" r="18" fill="#dd6655" />
        <circle cx="18" cy="24" r="13" fill="#e87060" />
        <circle cx="11" cy="18" r="5" fill="#f09080" opacity="0.6" />
      </g>

      {/* TALL ORANGE round tree */}
      <g transform={`translate(${W * 0.16}, 106)`} filter="url(#nbTreeShadow)">
        <rect x="10" y="46" width="8" height="16" rx="3" fill="#7a4a28" />
        <ellipse cx="14" cy="52" rx="16" ry="5" fill="#00000012" />
        <circle cx="14" cy="36" r="18" fill="#c07828" />
        <circle cx="14" cy="26" r="14" fill="#d48a34" />
        <circle cx="14" cy="18" r="10" fill="#e09a40" />
        <circle cx="9" cy="13" r="4" fill="#f0b858" opacity="0.55" />
      </g>

      {/* SMALL ORANGE round tree */}
      <g transform={`translate(${W * 0.02}, 120)`} filter="url(#nbTreeShadow)">
        <rect x="8" y="36" width="7" height="13" rx="3" fill="#7a4a28" />
        <circle cx="11" cy="28" r="14" fill="#b87030" />
        <circle cx="11" cy="20" r="10" fill="#cc8238" />
        <circle cx="11" cy="13" r="7" fill="#de9240" />
        <circle cx="7" cy="10" r="3" fill="#eea850" opacity="0.5" />
      </g>

      {/* TALL PINE — right */}
      <g transform={`translate(${W * 0.76}, 60)`} filter="url(#nbTreeShadow)">
        <rect x="11" y="72" width="8" height="16" rx="3" fill="#6a4020" />
        <polygon points="15,72 -4,52 34,52" fill="#2d7a35" />
        <polygon points="15,58 0,40 30,40" fill="#358c3e" />
        <polygon points="15,44 3,28 27,28" fill="#3d9e47" />
        <polygon points="15,32 6,18 24,18" fill="#45b050" />
        <polygon points="15,22 9,10 21,10" fill="#50c05a" />
        <polygon points="15,10 11,2 19,2" fill="#5ad064" />
      </g>

      {/* MEDIUM ROUND GREEN — right */}
      <g transform={`translate(${W * 0.84}, 78)`} filter="url(#nbTreeShadowSm)">
        <rect x="11" y="44" width="8" height="14" rx="3" fill="#6a4020" />
        <ellipse cx="15" cy="50" rx="15" ry="4" fill="#00000010" />
        <circle cx="15" cy="34" r="17" fill="#2a7030" />
        <circle cx="15" cy="24" r="13" fill="#348040" />
        <circle cx="15" cy="16" r="9" fill="#3d9050" />
        <circle cx="10" cy="11" r="4" fill="#58b068" opacity="0.55" />
      </g>

      {/* SMALL ROUND GREEN — far right */}
      <g transform={`translate(${W * 0.93}, 94)`} filter="url(#nbTreeShadowSm)">
        <rect x="9" y="36" width="6" height="12" rx="2" fill="#6a4020" />
        <circle cx="12" cy="28" r="13" fill="#3a8844" />
        <circle cx="12" cy="20" r="9" fill="#48a054" />
        <circle cx="12" cy="14" r="6" fill="#55b562" />
        <circle cx="8" cy="10" r="3" fill="#70cc80" opacity="0.5" />
      </g>

      {/* ── Flowers on hillside ── */}
      <circle cx={W * 0.58} cy={130} r="3" fill="#ff9090" />
      <circle cx={W * 0.61} cy={126} r="2" fill="#ffb0b0" />
      <circle cx={W * 0.64} cy={132} r="2.5" fill="#ff8080" />
      <circle cx={W * 0.59} cy={134} r="1.5" fill="#ffe0a0" />
      <circle cx={W * 0.68} cy={142} r="2.5" fill="#90b0ff" />
      <circle cx={W * 0.70} cy={139} r="2" fill="#a0c0ff" />
      <circle cx={W * 0.73} cy={144} r="2" fill="#80a0ee" />

      {/* ── Small bushes at base of hills ── */}
      <g transform={`translate(${W * 0.06}, 148)`}>
        <ellipse cx="12" cy="10" rx="14" ry="8" fill="#558b2f" />
        <ellipse cx="24" cy="10" rx="12" ry="7" fill="#7cb342" />
        <ellipse cx="17" cy="7" rx="10" ry="7" fill="#9ccc65" />
      </g>
      <g transform={`translate(${W * 0.74}, 140)`}>
        <ellipse cx="10" cy="8" rx="12" ry="7" fill="#558b2f" />
        <ellipse cx="22" cy="8" rx="12" ry="7" fill="#7cb342" />
        <ellipse cx="15" cy="5" rx="9" ry="6" fill="#9ccc65" />
      </g>

      {/* ── Subtle terrain patches ── */}
      <ellipse cx={W * 0.22} cy={SKY_TOP + 100} rx={W * 0.28} ry={30} fill="#90c850" opacity="0.25" />
      <ellipse cx={W * 0.72} cy={SKY_TOP + 200} rx={W * 0.22} ry={25} fill="#88c048" opacity="0.2" />
      <ellipse cx={W * 0.5} cy={B - 80} rx={W * 0.3} ry={28} fill="#90c850" opacity="0.15" />

      {/* ── BOTTOM ZONE — calm green waves ── */}
      <path
        d={`M0 ${B} Q${W * 0.15} ${B - 25}, ${W * 0.3} ${B + 5} Q${W * 0.5} ${B + 30}, ${W * 0.7} ${B - 8} Q${W * 0.85} ${B - 28}, ${W} ${B - 3} L${W} ${H} L0 ${H} Z`}
        fill="#7cb850"
      />
      <path
        d={`M0 ${B + 50} Q${W * 0.2} ${B + 28}, ${W * 0.4} ${B + 55} Q${W * 0.6} ${B + 75}, ${W * 0.8} ${B + 42} Q${W * 0.95} ${B + 24}, ${W} ${B + 45} L${W} ${H} L0 ${H} Z`}
        fill="#6aaa45"
      />
      <path
        d={`M0 ${B + 100} Q${W * 0.25} ${B + 82}, ${W * 0.5} ${B + 108} Q${W * 0.75} ${B + 130}, ${W} ${B + 95} L${W} ${H} L0 ${H} Z`}
        fill="#5a9a3a"
      />
      <path
        d={`M0 ${B + 155} Q${W * 0.3} ${B + 140}, ${W * 0.6} ${B + 162} Q${W * 0.85} ${B + 175}, ${W} ${B + 150} L${W} ${H} L0 ${H} Z`}
        fill="#4a8a30"
      />

      {/* ── Trees in bottom zone ── */}
      <g transform={`translate(${W * 0.04}, ${B - 20})`} opacity="0.55">
        <rect x="11" y="44" width="6" height="12" rx="2" fill="#5a8040" />
        <circle cx="14" cy="34" r="14" fill="#3a8844" />
        <circle cx="14" cy="26" r="10" fill="#48a054" />
        <circle cx="14" cy="19" r="7" fill="#55b562" />
      </g>
      <g transform={`translate(${W * 0.86}, ${B - 12})`} opacity="0.5">
        <rect x="10" y="46" width="8" height="14" rx="3" fill="#5a8040" />
        <circle cx="14" cy="36" r="16" fill="#2a7030" />
        <circle cx="14" cy="26" r="12" fill="#348040" />
        <circle cx="14" cy="18" r="8" fill="#3d9050" />
      </g>

      {/* Bushes in bottom zone */}
      <g transform={`translate(${W * 0.62}, ${B + 30})`} opacity="0.7">
        <ellipse cx="14" cy="10" rx="18" ry="11" fill="#5a9a3a" />
        <ellipse cx="30" cy="10" rx="16" ry="10" fill="#6aaa48" />
        <ellipse cx="21" cy="7" rx="14" ry="9" fill="#7cb850" />
      </g>
      <g transform={`translate(${W * 0.01}, ${B + 50})`} opacity="0.7">
        <ellipse cx="18" cy="10" rx="20" ry="11" fill="#5a9a3a" />
        <ellipse cx="34" cy="10" rx="16" ry="9" fill="#6aaa48" />
      </g>

      {/* ── Sparkle ── */}
      <g transform={`translate(${W * 0.88}, ${H - 30})`} opacity="0.6">
        <path d="M6 0 L7 4 L11 5 L7 6 L6 10 L5 6 L1 5 L5 4 Z" fill="#fff" />
      </g>
    </svg>
  );
}

// ─── Scattered world decorations (flowers, mushrooms, grass, stones) ───

const Deco = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
});

function WorldDecorations({ W, H }: { W: number; H: number }) {
  const d: React.ReactNode[] = [];
  const contentStart = SKY_TOP + 40;
  const contentEnd = H - BOTTOM_ZONE - 20;
  const span = contentEnd - contentStart;

  // Flowers
  const flowerColors = ['#f48fb1', '#90caf9', '#fff176', '#ce93d8'];
  const flowerSpots: [number, number][] = [
    [0.15, 0.15], [0.8, 0.25], [0.25, 0.45], [0.7, 0.55], [0.12, 0.7], [0.85, 0.8],
  ];
  for (let i = 0; i < flowerSpots.length; i++) {
    const [fx, fy] = flowerSpots[i];
    const y = contentStart + span * fy;
    d.push(
      <Deco key={`fl${i}`} style={{ left: W * fx, top: y }}>
        <svg width="12" height="18" viewBox="0 0 12 18">
          <line x1="6" y1="9" x2="6" y2="18" stroke="#66bb6a" strokeWidth="1.5" />
          <circle cx="6" cy="6" r="3.5" fill={flowerColors[i % flowerColors.length]} />
          <circle cx="6" cy="6" r="1.5" fill="#fff176" />
        </svg>
      </Deco>,
    );
  }

  // Mushrooms
  const mushroomSpots: [number, number][] = [[0.35, 0.3], [0.6, 0.65]];
  for (let i = 0; i < mushroomSpots.length; i++) {
    const [mx, my] = mushroomSpots[i];
    const y = contentStart + span * my;
    d.push(
      <Deco key={`mu${i}`} style={{ left: W * mx, top: y }}>
        <svg width="14" height="16" viewBox="0 0 14 16">
          <rect x="5" y="10" width="3" height="6" rx="1.5" fill="#fff9c4" />
          <ellipse cx="6.5" cy="8" rx="6.5" ry="5.5" fill="#ef5350" />
          <circle cx="4" cy="6.5" r="1.2" fill="#fff" opacity="0.7" />
          <circle cx="8.5" cy="7.5" r="0.9" fill="#fff" opacity="0.6" />
        </svg>
      </Deco>,
    );
  }

  // Grass tufts
  const grassSpots: [number, number][] = [[0.2, 0.2], [0.55, 0.4], [0.3, 0.6], [0.75, 0.75]];
  for (let i = 0; i < grassSpots.length; i++) {
    const [gx, gy] = grassSpots[i];
    const y = contentStart + span * gy;
    d.push(
      <Deco key={`gr${i}`} style={{ left: W * gx, top: y }}>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <path d="M2 12 Q2 5 1 1" stroke="#6ab050" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M6 12 Q6 3 5 0" stroke="#8bc34a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M10 12 Q10 3 11 0" stroke="#6ab050" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M14 12 Q14 5 15 1" stroke="#7cb850" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </Deco>,
    );
  }

  // Stepping stones
  const stoneSpots: [number, number][] = [[0.4, 0.35], [0.65, 0.55], [0.3, 0.8]];
  for (let i = 0; i < stoneSpots.length; i++) {
    const [sx, sy] = stoneSpots[i];
    const y = contentStart + span * sy;
    d.push(
      <Deco key={`st${i}`} style={{ left: W * sx, top: y }}>
        <svg width="22" height="12" viewBox="0 0 22 12">
          <ellipse cx="11" cy="7" rx="11" ry="5" fill="#bdbdbd" opacity="0.4" />
          <ellipse cx="9" cy="5.5" rx="7" ry="3.5" fill="#e0e0e0" opacity="0.3" />
        </svg>
      </Deco>,
    );
  }

  return <>{d}</>;
}

// ─── Main Component ───

interface NatureBackgroundProps {
  children: React.ReactNode;
}

export default function NatureBackground({ children }: NatureBackgroundProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [sceneOverlay, setSceneOverlay] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth || 360, h: el.clientHeight || 800 });
    return () => ro.disconnect();
  }, []);

  const scene = useMemo(
    () => dims.w > 0 && dims.h > 0 ? <SceneSvg W={dims.w} H={dims.h} /> : null,
    [dims.w, dims.h],
  );

  const decos = useMemo(
    () => dims.w > 0 && dims.h > 0 ? <WorldDecorations W={dims.w} H={dims.h} /> : null,
    [dims.w, dims.h],
  );

  return (
    <ThemedSceneOverlayContext.Provider value={setSceneOverlay}>
      <Wrapper ref={wrapperRef}>
        {scene}
        {decos}
        {sceneOverlay}
        <ContentLayer>{children}</ContentLayer>
      </Wrapper>
    </ThemedSceneOverlayContext.Provider>
  );
}
