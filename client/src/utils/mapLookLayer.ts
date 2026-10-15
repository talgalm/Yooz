import type { MapOverlayKind } from './mapDesign';

const PAPER_GRAIN = 'url(/images/map/paper-grain.svg)';
const SEPIA_WASH = 'rgba(176, 112, 48, 0.6)';
const GRID_MINOR = 'rgba(255, 255, 255, 0.07)';
const GRID_MAJOR = 'rgba(255, 255, 255, 0.14)';

export interface OverlayLayer {
  background: string;
  size: string;
  blend: 'multiply' | 'normal';
  opacity: number;
}

export const OVERLAY_LAYERS: Record<MapOverlayKind, OverlayLayer> = {
  paper: {
    background: `radial-gradient(ellipse at center, transparent 62%, rgba(110, 72, 34, 0.22) 100%), ${PAPER_GRAIN}`,
    size: 'cover, 480px 480px',
    blend: 'multiply',
    opacity: 0.7,
  },
  dust: {
    background: `radial-gradient(ellipse at center, transparent 50%, rgba(90, 44, 12, 0.4) 100%), linear-gradient(${SEPIA_WASH}, ${SEPIA_WASH}), ${PAPER_GRAIN}`,
    size: 'cover, cover, 480px 480px',
    blend: 'multiply',
    opacity: 0.9,
  },
  grid: {
    background: [
      `linear-gradient(${GRID_MAJOR} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${GRID_MAJOR} 1px, transparent 1px)`,
      `linear-gradient(${GRID_MINOR} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${GRID_MINOR} 1px, transparent 1px)`,
      'radial-gradient(ellipse at center, transparent 60%, rgba(6, 24, 52, 0.35) 100%)',
    ].join(', '),
    size: '120px 120px, 120px 120px, 24px 24px, 24px 24px, cover',
    blend: 'normal',
    opacity: 1,
  },
};
