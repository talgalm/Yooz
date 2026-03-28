import React, { useEffect, useRef, useState, useMemo } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { ThemedSceneOverlayContext } from '../context/themedSceneOverlayContext';

const SKY_TOP = 190;
const BOTTOM_ZONE = 240;

const Wrapper = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#1a5276',
});

const ContentLayer = styled('div')({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

const bubbleRise = keyframes`
  0%   { transform: translateY(0) scale(1); opacity: 0.5; }
  50%  { opacity: 0.7; }
  100% { transform: translateY(-120px) scale(1.3); opacity: 0; }
`;

const shimmer = keyframes`
  0%   { opacity: 0.08; }
  50%  { opacity: 0.18; }
  100% { opacity: 0.08; }
`;

const BubbleEl = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), rgba(255,255,255,0.1))',
  border: '1px solid rgba(255,255,255,0.2)',
  animation: `${bubbleRise} 6s ease-in infinite`,
  pointerEvents: 'none',
});

const LightRay = styled('div')({
  position: 'absolute',
  top: 0,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
  transformOrigin: 'top center',
  pointerEvents: 'none',
  animation: `${shimmer} 4s ease-in-out infinite`,
});

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
      <defs>
        <linearGradient id="oceanDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ABED6" />
          <stop offset="20%" stopColor="#428bad" />
          <stop offset="50%" stopColor="#2d6e8a" />
          <stop offset="80%" stopColor="#1a5276" />
          <stop offset="100%" stopColor="#0e3a58" />
        </linearGradient>
        <linearGradient id="sandFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4A86A" />
          <stop offset="100%" stopColor="#9E8654" />
        </linearGradient>
        <filter id="oceanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#oceanDepth)" />

      {/* Surface ripples at top */}
      <path
        d={`M0 ${SKY_TOP * 0.3} Q${W * 0.15} ${SKY_TOP * 0.22}, ${W * 0.3} ${SKY_TOP * 0.32} Q${W * 0.5} ${SKY_TOP * 0.42}, ${W * 0.7} ${SKY_TOP * 0.28} Q${W * 0.85} ${SKY_TOP * 0.18}, ${W} ${SKY_TOP * 0.3}`}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
      />
      <path
        d={`M0 ${SKY_TOP * 0.45} Q${W * 0.2} ${SKY_TOP * 0.38}, ${W * 0.4} ${SKY_TOP * 0.48} Q${W * 0.6} ${SKY_TOP * 0.55}, ${W * 0.8} ${SKY_TOP * 0.4} Q${W * 0.9} ${SKY_TOP * 0.34}, ${W} ${SKY_TOP * 0.42}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />

      {/* Light rays from surface */}
      <polygon
        points={`${W * 0.2},0 ${W * 0.28},0 ${W * 0.38},${H * 0.6} ${W * 0.24},${H * 0.6}`}
        fill="rgba(255,255,255,0.04)"
      />
      <polygon
        points={`${W * 0.55},0 ${W * 0.62},0 ${W * 0.72},${H * 0.55} ${W * 0.58},${H * 0.55}`}
        fill="rgba(255,255,255,0.035)"
      />
      <polygon
        points={`${W * 0.78},0 ${W * 0.84},0 ${W * 0.9},${H * 0.5} ${W * 0.76},${H * 0.5}`}
        fill="rgba(255,255,255,0.03)"
      />

      {/* Sandy ocean floor */}
      <path
        d={`M0 ${B + 60} Q${W * 0.15} ${B + 40}, ${W * 0.3} ${B + 65} Q${W * 0.5} ${B + 85}, ${W * 0.7} ${B + 50} Q${W * 0.85} ${B + 35}, ${W} ${B + 55} L${W} ${H} L0 ${H} Z`}
        fill="url(#sandFloor)"
      />
      <path
        d={`M0 ${B + 90} Q${W * 0.2} ${B + 75}, ${W * 0.4} ${B + 95} Q${W * 0.6} ${B + 110}, ${W * 0.8} ${B + 80} Q${W * 0.9} ${B + 70}, ${W} ${B + 85} L${W} ${H} L0 ${H} Z`}
        fill="#B09858"
        opacity="0.5"
      />

      {/* Coral reef on the floor - left side */}
      <g transform={`translate(${W * 0.05}, ${B + 20})`}>
        <path d="M20,80 L18,55 Q15,42 12,30 Q10,20 14,12 Q18,4 22,12 Q24,20 22,30 Q19,42 18,50" fill="#E86B5A" />
        <path d="M12,30 Q6,22 4,14 Q8,18 10,24" fill="#F07A6A" opacity="0.7" />
        <path d="M22,30 Q28,22 30,14 Q26,18 24,24" fill="#F07A6A" opacity="0.7" />
        <circle cx="14" cy="10" r="2.5" fill="#FF9080" opacity="0.6" />
        <circle cx="22" cy="10" r="2.5" fill="#FF9080" opacity="0.6" />
      </g>

      {/* Pink fan coral - right */}
      <g transform={`translate(${W * 0.82}, ${B + 15})`}>
        <path d="M18,75 L16,55 Q14,42 12,30 Q8,16 14,6 Q18,0 22,6 Q28,16 24,30 Q22,42 20,55 Z" fill="#E87BAE" />
        <path d="M12,30 Q6,20 2,14 Q6,18 10,24" fill="#F08EC0" opacity="0.6" />
        <path d="M24,30 Q30,20 34,14 Q30,18 26,24" fill="#F08EC0" opacity="0.6" />
        <ellipse cx="18" cy="16" rx="8" ry="7" fill="#F8A0D0" opacity="0.35" />
      </g>

      {/* Seaweed - multiple patches */}
      <g transform={`translate(${W * 0.15}, ${B - 10})`} opacity="0.8">
        <path d="M10,100 Q8,80 6,60 Q4,40 6,20 Q8,8 10,20 Q12,40 14,60 Q16,80 10,100 Z" fill="#2D8B5A" />
        <path d="M6,60 Q2,48 0,36 Q4,44 6,52" fill="#38A068" opacity="0.6" />
      </g>
      <g transform={`translate(${W * 0.7}, ${B - 5})`} opacity="0.75">
        <path d="M8,95 Q6,75 4,55 Q2,35 4,15 Q6,5 8,15 Q10,35 12,55 Q14,75 8,95 Z" fill="#248050" />
        <path d="M12,55 Q16,44 18,32 Q14,40 12,48" fill="#2C9060" opacity="0.5" />
      </g>
      <g transform={`translate(${W * 0.42}, ${B + 5})`} opacity="0.7">
        <path d="M6,85 Q4,68 3,50 Q2,30 4,12 Q6,4 8,12 Q10,30 9,50 Q8,68 6,85 Z" fill="#2D8B5A" />
      </g>

      {/* Ocean floor rocks */}
      <g transform={`translate(${W * 0.3}, ${B + 55})`}>
        <path d="M5,24 Q2,20 4,14 Q8,6 18,4 Q26,2 34,6 Q38,12 36,18 Q30,24 20,26 Q10,26 5,24 Z" fill="#4A6878" />
        <path d="M18,4 Q26,2 34,6 Q28,8 20,8 Q12,10 8,14 Z" fill="#5A7888" opacity="0.4" />
      </g>
      <g transform={`translate(${W * 0.58}, ${B + 65})`}>
        <path d="M4,20 Q1,16 3,10 Q7,4 14,2 Q22,1 28,5 Q32,10 30,16 Q24,20 16,22 Q8,22 4,20 Z" fill="#4A6878" />
        <path d="M14,2 Q22,1 28,5 Q22,6 14,6 Q8,8 5,12 Z" fill="#5A7888" opacity="0.35" />
      </g>

      {/* Shell on the floor */}
      <g transform={`translate(${W * 0.48}, ${B + 80})`}>
        <path d="M11,2 Q20,2 22,10 Q24,16 20,20 Q14,22 8,20 Q3,16 2,10 Q2,4 6,2 Q8,2 11,2 Z" fill="#F0D8B0" />
        <path d="M11,3 Q10,8 9,14" stroke="#D8C098" stroke-width="0.8" fill="none" />
        <path d="M11,3 Q12,8 13,14" stroke="#D8C098" stroke-width="0.8" fill="none" />
        <path d="M11,3 Q11,8 11,14" stroke="#D8C098" stroke-width="0.6" fill="none" />
      </g>

      {/* Starfish */}
      <g transform={`translate(${W * 0.2}, ${B + 75})`}>
        <path d="M12,1 L14,8 L22,8 L16,13 L18,21 L12,16 L6,21 L8,13 L2,8 L10,8 Z" fill="#E8785A" />
        <path d="M12,4 L13,8 L18,8 L15,12 L16,18 L12,14 L8,18 L9,12 L5,8 L10,8 Z" fill="#F08A6A" opacity="0.6" />
      </g>

      {/* Small fish */}
      <g transform={`translate(${W * 0.55}, ${SKY_TOP + 60})`} opacity="0.6">
        <path d="M22,8 Q18,3 12,2 Q6,3 2,8 Q6,13 12,14 Q18,13 22,8 Z" fill="#FFB84D" />
        <path d="M22,8 L28,3 L28,13 Z" fill="#FF9E33" />
        <circle cx="8" cy="7" r="1.2" fill="#333" />
        <circle cx="7.7" cy="6.7" r="0.5" fill="#fff" />
      </g>
      <g transform={`translate(${W * 0.18}, ${SKY_TOP + 120})`} opacity="0.5">
        <path d="M22,8 Q18,3 12,2 Q6,3 2,8 Q6,13 12,14 Q18,13 22,8 Z" fill="#90CAF9" />
        <path d="M22,8 L28,3 L28,13 Z" fill="#64B5F6" />
        <circle cx="8" cy="7" r="1.2" fill="#333" />
        <circle cx="7.7" cy="6.7" r="0.5" fill="#fff" />
      </g>
      <g transform={`translate(${W * 0.75}, ${B - 40})`} opacity="0.45">
        <path d="M22,8 Q18,3 12,2 Q6,3 2,8 Q6,13 12,14 Q18,13 22,8 Z" fill="#CE93D8" />
        <path d="M22,8 L28,3 L28,13 Z" fill="#AB47BC" />
        <circle cx="8" cy="7" r="1.2" fill="#333" />
        <circle cx="7.7" cy="6.7" r="0.5" fill="#fff" />
      </g>
    </svg>
  );
}

const Deco = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
});

function UnderwaterDecorations({ W, H }: { W: number; H: number }) {
  const d: React.ReactNode[] = [];
  const contentStart = SKY_TOP + 40;
  const contentEnd = H - BOTTOM_ZONE - 20;
  const span = contentEnd - contentStart;

  const bubbleSpots: [number, number, number][] = [
    [0.12, 0.3, 8], [0.35, 0.5, 6], [0.6, 0.2, 10],
    [0.78, 0.6, 7], [0.92, 0.4, 5], [0.22, 0.7, 9],
  ];
  for (let i = 0; i < bubbleSpots.length; i++) {
    const [bx, by, size] = bubbleSpots[i];
    const y = contentStart + span * by;
    d.push(
      <BubbleEl
        key={`bu${i}`}
        style={{
          left: W * bx,
          top: y,
          width: size,
          height: size,
          animationDelay: `${i * 1.1}s`,
          animationDuration: `${5 + i * 0.8}s`,
        }}
      />,
    );
  }

  const particleSpots: [number, number][] = [
    [0.1, 0.2], [0.3, 0.4], [0.5, 0.15], [0.7, 0.5], [0.85, 0.3],
    [0.2, 0.6], [0.4, 0.75], [0.6, 0.6], [0.9, 0.7],
  ];
  for (let i = 0; i < particleSpots.length; i++) {
    const [px, py] = particleSpots[i];
    const y = contentStart + span * py;
    d.push(
      <Deco key={`pt${i}`} style={{ left: W * px, top: y }}>
        <svg width="4" height="4" viewBox="0 0 4 4">
          <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.15)" />
        </svg>
      </Deco>,
    );
  }

  return <>{d}</>;
}

function LightRays({ W }: { W: number }) {
  const rays = [
    { left: W * 0.15, width: 40, height: '55%', rotate: -8, delay: 0 },
    { left: W * 0.4, width: 50, height: '60%', rotate: 3, delay: 1.5 },
    { left: W * 0.65, width: 35, height: '50%', rotate: -5, delay: 3 },
    { left: W * 0.85, width: 45, height: '45%', rotate: 6, delay: 2 },
  ];

  return (
    <>
      {rays.map((r, i) => (
        <LightRay
          key={i}
          style={{
            left: r.left,
            width: r.width,
            height: r.height,
            transform: `rotate(${r.rotate}deg)`,
            animationDelay: `${r.delay}s`,
          }}
        />
      ))}
    </>
  );
}

interface OceanBackgroundProps {
  children: React.ReactNode;
}

export default function OceanBackground({ children }: OceanBackgroundProps) {
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
    () => dims.w > 0 && dims.h > 0 ? <UnderwaterDecorations W={dims.w} H={dims.h} /> : null,
    [dims.w, dims.h],
  );

  return (
    <ThemedSceneOverlayContext.Provider value={setSceneOverlay}>
      <Wrapper ref={wrapperRef}>
        {scene}
        {dims.w > 0 && <LightRays W={dims.w} />}
        {decos}
        {sceneOverlay}
        <ContentLayer>{children}</ContentLayer>
      </Wrapper>
    </ThemedSceneOverlayContext.Provider>
  );
}
