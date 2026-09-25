import { styled, keyframes } from '@mui/material/styles';
import { REDUCED_MOTION } from './tokens';

const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(2%, -2.5%, 0) scale(1.04); }
`;

interface SoftBlobProps {
  color: string;
  intensity?: number;
  duration?: number;
  delay?: number;
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
