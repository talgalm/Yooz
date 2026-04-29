import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { ThemedSceneOverlayContext } from '../context/themedSceneOverlayContext';

const GRID_SIZE = 32;
const GRID_LINE = 'rgba(140,118,82,0.18)';
const SCENE_TOP = '#ECE4D2';
const SCENE_MID = '#E8E0CC';
const SCENE_BOTTOM = '#E4DBC6';
const SHELL_COLOR = '#8a7c6a';

const Wrapper = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: SHELL_COLOR,
});

const ContentLayer = styled('div')({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

function SceneSvg({ W, H }: { W: number; H: number }) {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="officeBgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_TOP} />
          <stop offset="55%" stopColor={SCENE_MID} />
          <stop offset="100%" stopColor={SCENE_BOTTOM} />
        </linearGradient>
        <pattern id="officeStationGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke={GRID_LINE}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#officeBgGrad)" />
      <rect x="0" y="0" width={W} height={H} fill="url(#officeStationGrid)" />
    </svg>
  );
}

interface OfficeBackgroundProps {
  children: React.ReactNode;
}

export default function OfficeBackground({ children }: OfficeBackgroundProps) {
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

  return (
    <ThemedSceneOverlayContext.Provider value={setSceneOverlay}>
      <Wrapper ref={wrapperRef}>
        {dims.w > 0 && dims.h > 0 && <SceneSvg W={dims.w} H={dims.h} />}
        {sceneOverlay}
        <ContentLayer>{children}</ContentLayer>
      </Wrapper>
    </ThemedSceneOverlayContext.Provider>
  );
}
