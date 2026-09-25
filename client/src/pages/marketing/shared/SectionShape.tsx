import { styled } from '@mui/material/styles';

export type ShapeVariant = 'peach' | 'lavender' | 'mint' | 'testimonials' | 'chevron';

interface SectionShapeProps {
  color: string;
  variant: ShapeVariant;
  height?: number;
}

const Svg = styled('svg')<{ h: number }>(({ h }) => ({
  display: 'block',
  width: '100%',
  height: h,
  pointerEvents: 'none',
  marginBottom: -1,
}));

const PATHS: Record<ShapeVariant, string> = {
  peach: 'M0,6 C150,30 300,50 450,61 C600,69 760,74 900,76 L1440,76 L1440,120 L0,120 Z',
  lavender: 'M0,6 C300,52 500,76 720,76 C940,76 1140,52 1440,7 L1440,120 L0,120 Z',
  mint: 'M0,14 C60,8 110,6 150,6 C400,10 700,30 1000,48 C1180,58 1320,68 1440,76 L1440,120 L0,120 Z',
  testimonials: 'M0,20 C280,66 560,84 720,84 C880,84 1160,66 1440,20 L1440,120 L0,120 Z',
  chevron: 'M0,120 L0,96 L720,0 L1440,96 L1440,120 Z',
};

export default function SectionShape({ color, variant, height = 110 }: SectionShapeProps) {
  return (
    <Svg viewBox="0 0 1440 120" preserveAspectRatio="none" h={height} aria-hidden focusable="false">
      <path d={PATHS[variant]} fill={color} />
    </Svg>
  );
}
