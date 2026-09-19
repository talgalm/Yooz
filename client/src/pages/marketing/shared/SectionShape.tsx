import { styled } from '@mui/material/styles';

/** The curved boundaries between the coloured bands. */

export type ShapeVariant = 'peach' | 'lavender' | 'mint' | 'testimonials' | 'chevron';

interface SectionShapeProps {
  /** Fill of the shape, i.e. the colour of the band being entered. */
  color: string;
  variant: ShapeVariant;
  /** Height in px. */
  height?: number;
}

const Svg = styled('svg')<{ h: number }>(({ h }) => ({
  display: 'block',
  width: '100%',
  height: h,
  pointerEvents: 'none',
  // Kills the hairline seam that can appear between the shape and its band.
  marginBottom: -1,
}));

/**
 * Traced by column-scanning each export for the row where the band colour
 * begins, normalised to a 1440x120 box.
 *
 * Do not substitute the file's band vectors here: those are ~1800x648 background
 * blobs, and squeezing one into a 96px strip compresses it ~14x into a smear.
 */
const PATHS: Record<ShapeVariant, string> = {
  // Boundary starts y1744 at the left edge, eases down to y1803 by x~1014.
  peach: 'M0,6 C150,30 300,50 450,61 C600,69 760,74 900,76 L1440,76 L1440,120 L0,120 Z',
  // y2264 at both edges, bellying down to y2354 at the centre.
  lavender: 'M0,6 C300,52 500,76 720,76 C940,76 1140,52 1440,7 L1440,120 L0,120 Z',
  // Peaks near x~150 then slides steadily down to the right edge.
  mint: 'M0,14 C60,8 110,6 150,6 C400,10 700,30 1000,48 C1180,58 1320,68 1440,76 L1440,120 L0,120 Z',
  // Gentle symmetric dome under the testimonials.
  testimonials: 'M0,20 C280,66 560,84 720,84 C880,84 1160,66 1440,20 L1440,120 L0,120 Z',
  // The Marketing Engine band enters on a wide point.
  chevron: 'M0,120 L0,96 L720,0 L1440,96 L1440,120 Z',
};

export default function SectionShape({ color, variant, height = 110 }: SectionShapeProps) {
  return (
    <Svg viewBox="0 0 1440 120" preserveAspectRatio="none" h={height} aria-hidden focusable="false">
      <path d={PATHS[variant]} fill={color} />
    </Svg>
  );
}
