import { styled, keyframes } from '@mui/material/styles';
import { REDUCED_MOTION } from './tokens';

const morphA = keyframes`
  0%, 100% { border-radius: 58% 42% 39% 61% / 47% 55% 45% 53%; }
  33%      { border-radius: 43% 57% 62% 38% / 58% 41% 59% 42%; }
  66%      { border-radius: 61% 39% 48% 52% / 39% 62% 38% 61%; }
`;

const morphB = keyframes`
  0%, 100% { border-radius: 40% 60% 55% 45% / 56% 42% 58% 44%; }
  33%      { border-radius: 62% 38% 41% 59% / 42% 61% 39% 58%; }
  66%      { border-radius: 47% 53% 63% 37% / 61% 45% 55% 39%; }
`;

const morphC = keyframes`
  0%, 100% { border-radius: 52% 48% 61% 39% / 42% 58% 42% 58%; }
  33%      { border-radius: 38% 62% 44% 56% / 60% 39% 61% 40%; }
  66%      { border-radius: 59% 41% 52% 48% / 45% 56% 44% 55%; }
`;

const SHAPES = { a: morphA, b: morphB, c: morphC } as const;

export type BlobShape = keyof typeof SHAPES;

interface BlobProps {
  shape?: BlobShape;
  duration?: number;
  delay?: number;
}

const Blob = styled('div', {
  shouldForwardProp: (p) => p !== 'shape' && p !== 'duration' && p !== 'delay',
})<BlobProps>(({ shape = 'a', duration = 18, delay = 0 }) => ({
  position: 'absolute',
  animation: `${SHAPES[shape]} ${duration}s ease-in-out ${delay}s infinite`,
  pointerEvents: 'none',
  willChange: 'border-radius',
  [REDUCED_MOTION]: { animation: 'none', borderRadius: '52% 48% 58% 42% / 46% 56% 44% 54%' },
}));

export default Blob;
