import React from 'react';
import NatureBackground from './NatureBackground';
import OceanBackground from './OceanBackground';
import DesertBackground from './DesertBackground';

interface ThemedBackgroundProps {
  theme?: string;
  children: React.ReactNode;
}

export default function ThemedBackground({ theme, children }: ThemedBackgroundProps) {
  switch (theme) {
    case 'ocean':
      return <OceanBackground>{children}</OceanBackground>;
    case 'desert':
      return <DesertBackground>{children}</DesertBackground>;
    default:
      return <NatureBackground>{children}</NatureBackground>;
  }
}

export function getThemeShellColor(theme?: string): string {
  switch (theme) {
    case 'ocean':  return '#428bad';
    case 'desert': return '#D4A84B';
    default:       return '#8fb248';
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
    default:
      return `
        radial-gradient(circle at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 26%, rgba(156,208,96,0.2) 56%, rgba(88,152,58,0.42) 100%),
        linear-gradient(180deg, rgba(184,232,240,0.18) 0%, rgba(156,208,96,0.2) 42%, rgba(84,146,50,0.34) 100%)
      `;
  }
}
