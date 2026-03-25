import React, { useEffect, useRef, useState, useMemo } from 'react';
import { styled, keyframes } from '@mui/material/styles';

const SKY_TOP = 190;
const BOTTOM_ZONE = 240;

const Wrapper = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#C89838',
});

const ContentLayer = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
});

const heatShimmer = keyframes`
  0%   { opacity: 0.03; }
  50%  { opacity: 0.08; }
  100% { opacity: 0.03; }
`;

const HeatWave = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
  animation: `${heatShimmer} 5s ease-in-out infinite`,
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
        <linearGradient id="desertSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0C860" />
          <stop offset="30%" stopColor="#E8B848" />
          <stop offset="60%" stopColor="#D4A040" />
          <stop offset="100%" stopColor="#C89838" />
        </linearGradient>
        <filter id="desertShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#00000020" />
        </filter>
      </defs>

      {/* Sky gradient */}
      <rect x="0" y="0" width={W} height={SKY_TOP + 40} fill="url(#desertSky)" />

      {/* Main sand ground */}
      <rect x="0" y={SKY_TOP - 30} width={W} height={H - SKY_TOP + 30} fill="#C89838" />

      {/* Sun */}
      <circle cx={W * 0.78} cy={50} r={28} fill="#F8E070" opacity="0.8" />
      <circle cx={W * 0.78} cy={50} r={20} fill="#FFF0A0" opacity="0.5" />

      {/* Clouds (sparse desert clouds) */}
      <g opacity="0.4">
        <ellipse cx={W * 0.25} cy={45} rx={24} ry={8} fill="#fff" />
        <ellipse cx={W * 0.2} cy={45} rx={16} ry={7} fill="#fff" />
        <ellipse cx={W * 0.31} cy={45} rx={14} ry={6} fill="#fff" />
      </g>

      {/* Far dunes (back) */}
      <ellipse cx={W * 0.3} cy={160} rx={W * 0.6} ry={70} fill="#D4A84B" />
      <ellipse cx={W * 0.75} cy={155} rx={W * 0.5} ry={65} fill="#CCA040" />

      {/* Mid dunes */}
      <ellipse cx={W * 0.15} cy={185} rx={W * 0.5} ry={60} fill="#C09030" />
      <ellipse cx={W * 0.85} cy={180} rx={W * 0.45} ry={55} fill="#B88828" />

      {/* Front ground */}
      <ellipse cx={W * 0.5} cy={SKY_TOP + 25} rx={W * 0.8} ry={38} fill="#B88020" />

      {/* Sand texture lines */}
      <path
        d={`M0 ${SKY_TOP + 80} Q${W * 0.15} ${SKY_TOP + 72}, ${W * 0.35} ${SKY_TOP + 82} Q${W * 0.55} ${SKY_TOP + 90}, ${W * 0.75} ${SKY_TOP + 76} Q${W * 0.9} ${SKY_TOP + 70}, ${W} ${SKY_TOP + 78}`}
        fill="none"
        stroke="rgba(160,120,50,0.2)"
        strokeWidth="1.5"
      />
      <path
        d={`M0 ${SKY_TOP + 160} Q${W * 0.2} ${SKY_TOP + 150}, ${W * 0.4} ${SKY_TOP + 162} Q${W * 0.6} ${SKY_TOP + 172}, ${W * 0.8} ${SKY_TOP + 155} Q${W * 0.95} ${SKY_TOP + 148}, ${W} ${SKY_TOP + 158}`}
        fill="none"
        stroke="rgba(160,120,50,0.15)"
        strokeWidth="1"
      />

      {/* Tall cactus left */}
      <g transform={`translate(${W * 0.08}, 76)`} filter="url(#desertShadow)">
        <ellipse cx="18" cy="106" rx="12" ry="3" fill="rgba(100,70,20,0.15)" />
        <rect x="14" y="30" width="8" height="78" rx="4" fill="#4A8B3A" />
        <rect x="15.5" y="32" width="2" height="74" rx="1" fill="#5AA84A" opacity="0.35" />
        <path d="M14,60 L8,60 Q4,60 4,55 L4,44 Q4,39 8,39 Q8,44 8,50 Q8,58 12,60 Z" fill="#4A8B3A" />
        <path d="M22,48 L28,48 Q32,48 32,43 L32,34 Q32,29 28,29 Q28,34 28,40 Q28,46 24,48 Z" fill="#4A8B3A" />
      </g>

      {/* Round cactus right */}
      <g transform={`translate(${W * 0.85}, 108)`} filter="url(#desertShadow)">
        <ellipse cx="18" cy="38" rx="12" ry="2.5" fill="rgba(100,70,20,0.1)" />
        <ellipse cx="18" cy="24" rx="15" ry="18" fill="#4A8B3A" />
        <ellipse cx="18" cy="24" rx="12" ry="14" fill="#5A9B4A" opacity="0.4" />
        <path d="M10,16 L10,34" stroke="#3A7B2A" strokeWidth="0.6" opacity="0.3" />
        <path d="M14,10 L14,36" stroke="#3A7B2A" strokeWidth="0.6" opacity="0.3" />
        <path d="M18,8 L18,38" stroke="#3A7B2A" strokeWidth="0.6" opacity="0.3" />
        <path d="M22,10 L22,36" stroke="#3A7B2A" strokeWidth="0.6" opacity="0.3" />
        <path d="M26,16 L26,34" stroke="#3A7B2A" strokeWidth="0.6" opacity="0.3" />
        <circle cx="18" cy="8" r="3" fill="#F0E040" opacity="0.6" />
      </g>

      {/* Small cactus middle */}
      <g transform={`translate(${W * 0.68}, 130)`} filter="url(#desertShadow)">
        <rect x="8" y="14" width="6" height="42" rx="3" fill="#4A8B3A" />
        <rect x="9.2" y="16" width="1.5" height="38" rx="0.7" fill="#5AA84A" opacity="0.3" />
        <path d="M8,30 L4,30 Q2,30 2,27 L2,22 Q2,19 4,19 Q4,22 4,26 Q4,29 7,30 Z" fill="#4A8B3A" />
        <path d="M14,25 L18,25 Q20,25 20,22 L20,18 Q20,15 18,15 Q18,18 18,21 Q18,24 16,25 Z" fill="#4A8B3A" />
      </g>

      {/* Desert rocks */}
      <g transform={`translate(${W * 0.35}, ${SKY_TOP + 30})`}>
        <path d="M4,22 Q1,18 3,12 Q7,4 16,2 Q24,0 30,4 Q35,10 33,16 Q28,22 18,24 Q8,24 4,22 Z" fill="#A08058" />
        <path d="M16,2 Q24,0 30,4 Q24,5 16,5 Q10,7 6,12 Z" fill="#B89068" opacity="0.45" />
      </g>
      <g transform={`translate(${W * 0.55}, ${SKY_TOP + 50})`}>
        <path d="M3,16 Q1,12 3,8 Q6,3 12,1 Q18,0 22,4 Q26,8 24,14 Q20,18 14,20 Q6,20 3,16 Z" fill="#98784A" />
        <path d="M12,1 Q18,0 22,4 Q18,4 12,4 Q8,6 5,10 Z" fill="#A8885A" opacity="0.4" />
      </g>

      {/* Dry bush */}
      <g transform={`translate(${W * 0.22}, ${SKY_TOP + 10})`}>
        <path d="M14,24 Q12,18 10,14 Q8,10 6,6" stroke="#8B7830" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M14,24 Q16,18 18,14 Q20,10 22,6" stroke="#8B7830" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M14,24 Q14,18 14,10" stroke="#8B7830" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="6" cy="5" r="1.8" fill="#9B8840" opacity="0.35" />
        <circle cx="22" cy="5" r="1.8" fill="#9B8840" opacity="0.35" />
      </g>

      {/* Sand dune waves in bottom zone */}
      <path
        d={`M0 ${B} Q${W * 0.15} ${B - 20}, ${W * 0.3} ${B + 8} Q${W * 0.5} ${B + 30}, ${W * 0.7} ${B - 5} Q${W * 0.85} ${B - 22}, ${W} ${B} L${W} ${H} L0 ${H} Z`}
        fill="#B88828"
      />
      <path
        d={`M0 ${B + 50} Q${W * 0.2} ${B + 32}, ${W * 0.4} ${B + 55} Q${W * 0.6} ${B + 72}, ${W * 0.8} ${B + 40} Q${W * 0.95} ${B + 28}, ${W} ${B + 48} L${W} ${H} L0 ${H} Z`}
        fill="#A88020"
      />
      <path
        d={`M0 ${B + 100} Q${W * 0.25} ${B + 85}, ${W * 0.5} ${B + 108} Q${W * 0.75} ${B + 125}, ${W} ${B + 95} L${W} ${H} L0 ${H} Z`}
        fill="#987018"
      />
      <path
        d={`M0 ${B + 150} Q${W * 0.3} ${B + 138}, ${W * 0.6} ${B + 158} Q${W * 0.85} ${B + 170}, ${W} ${B + 148} L${W} ${H} L0 ${H} Z`}
        fill="#886010"
      />

      {/* Desert grass tufts */}
      <g transform={`translate(${W * 0.4}, ${B - 10})`}>
        <path d="M6,18 Q4,12 3,6 Q6,10 7,14 Q7,8 9,2 Q9,10 8,16 Q10,10 14,6 Q12,12 10,18 Z" fill="#7A8838" />
      </g>
      <g transform={`translate(${W * 0.75}, ${B + 15})`}>
        <path d="M6,16 Q4,10 3,5 Q6,8 7,12 Q7,6 9,1 Q9,8 8,14 Q10,8 13,4 Q11,10 9,16 Z" fill="#7A8838" opacity="0.8" />
      </g>

      {/* Sand ripple marks */}
      <path
        d={`M${W * 0.1} ${B + 70} Q${W * 0.2} ${B + 64}, ${W * 0.35} ${B + 68} Q${W * 0.45} ${B + 72}, ${W * 0.55} ${B + 66}`}
        stroke="rgba(160,120,40,0.25)"
        strokeWidth="1"
        fill="none"
      />
      <path
        d={`M${W * 0.5} ${B + 120} Q${W * 0.6} ${B + 115}, ${W * 0.75} ${B + 118} Q${W * 0.85} ${B + 122}, ${W * 0.9} ${B + 116}`}
        stroke="rgba(160,120,40,0.2)"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

const Deco = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
});

function DesertDecorations({ W, H }: { W: number; H: number }) {
  const d: React.ReactNode[] = [];
  const contentStart = SKY_TOP + 40;
  const contentEnd = H - BOTTOM_ZONE - 20;
  const span = contentEnd - contentStart;

  const tumbleweedSpots: [number, number][] = [[0.45, 0.35], [0.7, 0.65]];
  for (let i = 0; i < tumbleweedSpots.length; i++) {
    const [tx, ty] = tumbleweedSpots[i];
    const y = contentStart + span * ty;
    d.push(
      <Deco key={`tw${i}`} style={{ left: W * tx, top: y }}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#A0884A" strokeWidth="1" opacity="0.4" />
          <circle cx="8" cy="8" r="3" fill="none" stroke="#A0884A" strokeWidth="0.8" opacity="0.3" />
          <line x1="4" y1="4" x2="12" y2="12" stroke="#A0884A" strokeWidth="0.6" opacity="0.3" />
          <line x1="12" y1="4" x2="4" y2="12" stroke="#A0884A" strokeWidth="0.6" opacity="0.3" />
        </svg>
      </Deco>,
    );
  }

  const stoneSpots: [number, number][] = [[0.25, 0.25], [0.55, 0.5], [0.8, 0.4]];
  for (let i = 0; i < stoneSpots.length; i++) {
    const [sx, sy] = stoneSpots[i];
    const y = contentStart + span * sy;
    d.push(
      <Deco key={`ds${i}`} style={{ left: W * sx, top: y }}>
        <svg width="18" height="10" viewBox="0 0 18 10">
          <ellipse cx="9" cy="6" rx="9" ry="4" fill="#A08058" opacity="0.35" />
          <ellipse cx="7" cy="4.5" rx="6" ry="3" fill="#B89068" opacity="0.25" />
        </svg>
      </Deco>,
    );
  }

  const footprintSpots: [number, number][] = [[0.3, 0.45], [0.6, 0.3], [0.15, 0.6]];
  for (let i = 0; i < footprintSpots.length; i++) {
    const [fx, fy] = footprintSpots[i];
    const y = contentStart + span * fy;
    d.push(
      <Deco key={`fp${i}`} style={{ left: W * fx, top: y }}>
        <svg width="8" height="6" viewBox="0 0 8 6">
          <ellipse cx="4" cy="3" rx="3.5" ry="2.5" fill="rgba(0,0,0,0.04)" />
        </svg>
      </Deco>,
    );
  }

  return <>{d}</>;
}

interface DesertBackgroundProps {
  children: React.ReactNode;
}

export default function DesertBackground({ children }: DesertBackgroundProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

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
    () => dims.w > 0 && dims.h > 0 ? <DesertDecorations W={dims.w} H={dims.h} /> : null,
    [dims.w, dims.h],
  );

  return (
    <Wrapper ref={wrapperRef}>
      {scene}
      {dims.w > 0 && (
        <>
          <HeatWave style={{ left: '10%', top: 0, width: '25%', height: '40%', animationDelay: '0s' }} />
          <HeatWave style={{ left: '50%', top: 0, width: '20%', height: '35%', animationDelay: '2s' }} />
        </>
      )}
      {decos}
      <ContentLayer>{children}</ContentLayer>
    </Wrapper>
  );
}
