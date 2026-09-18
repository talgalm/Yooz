import { styled } from '@mui/material/styles';
import { C, BP } from '../shared/tokens';
import Blob from '../shared/Blob';

export interface VennLobe {
  label: string;
  text: string;
}

interface VennProps {
  items: [VennLobe, VennLobe, VennLobe];
}

const STACK_BP = '@media (max-width: 780px)';

const Stage = styled('div')({
  position: 'relative',
  width: 'min(590px, 100%)',
  marginInline: 'auto',
  aspectRatio: '1 / 0.98',
  marginTop: 16,
  [STACK_BP]: {
    aspectRatio: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 8,
  },
});

/**
 * One lobe: a morphing blob with its copy riding above it.
 *
 * Positioning is passed per instance so the three overlap the way the comp does.
 * Below 780px they stop overlapping and stack - at phone width the intersections
 * swallow the copy entirely.
 */
const Unit = styled('div')({
  position: 'absolute',
  width: '58%',
  aspectRatio: '1 / 0.94',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  [STACK_BP]: {
    position: 'static',
    width: '100%',
    aspectRatio: 'auto',
    padding: '26px 22px',
    borderRadius: 22,
  },
});

/**
 * `mix-blend-mode: multiply` darkens the intersections the way the comp does,
 * without having to draw the lens shapes by hand.
 */
const Fill = styled(Blob)({
  inset: 0,
  width: '100%',
  height: '100%',
  mixBlendMode: 'multiply',
  filter: 'blur(2px)',
  [STACK_BP]: { position: 'absolute', mixBlendMode: 'normal', filter: 'none', borderRadius: 22 },
});

const Copy = styled('div')({
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  width: '64%',
  [STACK_BP]: { width: '100%' },
});

const Label = styled('div')({
  fontSize: 35,
  fontWeight: 900,
  color: C.heading,
  marginBottom: 10,
  [BP.mobile]: { fontSize: 26 },
});

/** Size kept a step above the design's own; weight left regular. */
const Text = styled('div')({
  fontSize: 15,
  fontWeight: 400,
  lineHeight: 1.5,
  color: C.ink,
  [BP.mobile]: { fontSize: 14.5 },
});

/** "?למה לבחור Yooz" - Engage / Grow / Share as three overlapping fields. */
export default function Venn({ items }: VennProps) {
  const [engage, grow, share] = items;

  /**
   * Physical `left`, deliberately - not `inset-inline-start`.
   *
   * These are the diagram's own coordinates, read off the frame left to right:
   * Share outermost on the left, Engage overlapping above it, Grow to the right.
   * `inset-inline-start` measures from the RIGHT under RTL, so it mirrored the
   * whole figure - Share was pinned hard right and Grow ended up leftmost.
   *
   * A Venn's arrangement is not reading-direction dependent, so it stays physical
   * and renders identically in Hebrew and English. The copy inside each lobe is
   * centred, so nothing in here needs to flip.
   */
  const lobes = [
    { lobe: engage, bg: C.vennEngage, shape: 'a' as const, duration: 20, delay: 0, pos: { left: '21%', top: '0%' } },
    { lobe: grow, bg: C.vennGrow, shape: 'b' as const, duration: 24, delay: -6, pos: { left: '42%', top: '30%' } },
    { lobe: share, bg: C.vennShare, shape: 'c' as const, duration: 22, delay: -12, pos: { left: '1%', top: '32%' } },
  ];

  return (
    <Stage>
      {lobes.map(({ lobe, bg, shape, duration, delay, pos }) => (
        <Unit key={lobe.label} style={pos}>
          <Fill shape={shape} duration={duration} delay={delay} style={{ background: bg }} />
          <Copy>
            <Label>{lobe.label}</Label>
            <Text>{lobe.text}</Text>
          </Copy>
        </Unit>
      ))}
    </Stage>
  );
}
