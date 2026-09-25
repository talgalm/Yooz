import React, { useState } from 'react';
import NatureBackground from './NatureBackground';
import OceanBackground from './OceanBackground';
import DesertBackground from './DesertBackground';
import OfficeBackground from './OfficeBackground';
import { ThemedSceneOverlayContext } from '../context/themedSceneOverlayContext';
import type { CustomThemeData } from '../pages/StoryModulePage/types';

interface ThemedBackgroundProps {
  theme?: string;
  customTheme?: CustomThemeData;
  children: React.ReactNode;
}

export default function ThemedBackground({ theme, customTheme, children }: ThemedBackgroundProps) {
  if (customTheme?.stationsImage) {
    return <CustomThemeBackground stationsImage={customTheme.stationsImage}>{children}</CustomThemeBackground>;
  }

  switch (theme) {
    case 'ocean':
      return <OceanBackground>{children}</OceanBackground>;
    case 'desert':
      return <DesertBackground>{children}</DesertBackground>;
    case 'office':
      return <OfficeBackground>{children}</OfficeBackground>;
    case 'ganei-yehoshua':
      return <NatureBackground showClouds={false} showStaticTrees={false}>{children}</NatureBackground>;
    default:
      return <NatureBackground>{children}</NatureBackground>;
  }
}

function CustomThemeBackground({ stationsImage, children }: { stationsImage: string; children: React.ReactNode }) {
  const [sceneOverlay, setSceneOverlay] = useState<React.ReactNode | null>(null);
  return (
    <ThemedSceneOverlayContext.Provider value={setSceneOverlay}>
      <div style={{
        position: 'relative',
        minHeight: '100dvh',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundImage: `url(${stationsImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {sceneOverlay}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </ThemedSceneOverlayContext.Provider>
  );
}

export function getThemeShellColor(theme?: string): string {
  switch (theme) {
    case 'ocean':  return '#428bad';
    case 'desert': return '#D4A84B';
    case 'office': return '#8a7c6a';
    default:       return '#8fb248';
  }
}

export function getThemeSkyColor(theme?: string): string {
  switch (theme) {
    case 'ocean':  return '#5ABED6';
    case 'desert': return '#F0C860';
    case 'office': return '#ECE4D2';
    default:       return '#b8e8f0';
  }
}

export function getThemeGroundColor(theme?: string): string {
  switch (theme) {
    case 'ocean':  return '#0e3a58';
    case 'desert': return '#C89838';
    case 'office': return '#E4DBC6';
    default:       return '#4b8838';
  }
}

export function getThemeTransitionBackground(theme?: string): string {
  switch (theme) {
    case 'ocean':
      return `
        radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 26%, rgba(66,139,173,0.25) 56%, rgba(26,82,118,0.45) 100%),
        linear-gradient(180deg, rgba(90,190,214,0.2) 0%, rgba(66,139,173,0.25) 42%, rgba(26,82,118,0.38) 100%)
      `;
    case 'desert':
      return `
        radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(255,240,180,0.1) 26%, rgba(200,152,56,0.25) 56%, rgba(152,112,24,0.4) 100%),
        linear-gradient(180deg, rgba(240,200,96,0.2) 0%, rgba(200,152,56,0.25) 42%, rgba(136,96,16,0.35) 100%)
      `;
    case 'office':
      return `
        radial-gradient(circle at center, rgba(255,255,255,0.20) 0%, rgba(255,248,228,0.08) 26%, rgba(140,118,82,0.20) 56%, rgba(101,82,59,0.35) 100%),
        linear-gradient(180deg, rgba(236,228,210,0.18) 0%, rgba(200,180,140,0.20) 42%, rgba(120,98,72,0.32) 100%)
      `;
    default:
      return `
        radial-gradient(circle at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 26%, rgba(156,208,96,0.2) 56%, rgba(88,152,58,0.42) 100%),
        linear-gradient(180deg, rgba(184,232,240,0.18) 0%, rgba(156,208,96,0.2) 42%, rgba(84,146,50,0.34) 100%)
      `;
  }
}
