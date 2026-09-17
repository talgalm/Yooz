import { styled, keyframes } from '@mui/material/styles';
import { REDUCED_MOTION } from './tokens';

/**
 * The airbrushed shapes behind the hero art.
 *
 * In the comp these are large, very soft washes that bleed into the page ground
 * with no visible boundary, so each is a radial gradient falling off to
 * transparent and then blurred - not a filled shape with a hard silhouette.
 */

const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(2%, -2.5%, 0) scale(1.04); }
`;

interface SoftBlobProps {
  /** Core colour. Falls off to fully transparent at the edge. */
  color: string;
  /** How opaque the core reads, 0-1. */
  intensity?: number;
  /** Seconds for one drift cycle. Vary it so siblings never sync. */
  duration?: number;
  /** Negative values start the blob mid-cycle. */
  delay?: number;
  /** Blur radius in px. Larger reads softer and further back. */
  softness?: number;
}

const SoftBlob = styled('div', {
  shouldForwardProp: (p) =>
    p !== 'color' && p !== 'intensity' && p !== 'duration' && p !== 'delay' && p !== 'softness',
})<SoftBlobProps>(({ color, intensity = 1, duration = 26, delay = 0, softness = 30 }) => ({
  position: 'absolute',
  borderRadius: '50%',
  background: `radial-gradient(closest-side, ${color} 0%, ${color} 48%, transparent 100%)`,
  opacity: intensity,
  filter: `blur(${softness}px)`,
  animation: `${drift} ${duration}s ease-in-out ${delay}s infinite`,
  pointerEvents: 'none',
  willChange: 'transform',
  zIndex: 0,
  [REDUCED_MOTION]: { animation: 'none' },
}));

export default SoftBlob;
