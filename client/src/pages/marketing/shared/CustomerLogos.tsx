import { styled, keyframes } from '@mui/material/styles';
import { C, BP, REDUCED_MOTION } from './tokens';
import { Container, H2, DividedRow } from './styled';
import Reveal from './Reveal';

export interface Customer {
  name: string;
  /** What the client did with Yooz - the caption under each logo. */
  caption?: string;
  logoUrl?: string;
  linkUrl?: string;
}

interface CustomerLogosProps {
  title: string;
  items: Customer[];
  /** Ground for the band. Home and Business run this on pink. */
  bg?: string;
  /**
   * Scroll the row continuously instead of laying it out as a static divided
   * row, pausing while the pointer is over it. Off by default: Business,
   * Tourism and Academy share this component and keep the static row.
   */
  marquee?: boolean;
}

const Root = styled('section')<{ bg?: string }>(({ bg }) => ({
  background: bg ?? 'transparent',
  paddingBlock: 62,
  [BP.mobile]: { paddingBlock: 40 },
}));

const Col = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 6,
});

const LogoBox = styled('div')({
  height: 76,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
});

const LogoImg = styled('img')({ maxHeight: 76, maxWidth: '100%', objectFit: 'contain' });

/** Measured: name ink 22px, caption two lines 32px apart at ~20px type. */
const Name = styled('div')({ fontSize: 22, fontWeight: 800, color: C.heading });

const Caption = styled('div')({ fontSize: 19.5, lineHeight: 1.55, color: C.ink, maxWidth: 250 });

// ─── Marquee ───

const scrollX = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
`;

/**
 * The track is laid out LTR on purpose. Under the page's RTL the overflow runs
 * off the left edge, so translating by -50% would slide the content away and
 * leave blank space rather than loop. Going LTR puts the overflow on the right
 * where the classic -50% marquee works. Each column centres its own text, so the
 * Hebrew inside still reads correctly.
 */
const Viewport = styled('div')({
  overflow: 'hidden',
  direction: 'ltr',
  WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
  maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
});

const Track = styled('div', { shouldForwardProp: (p) => p !== 'seconds' })<{ seconds: number }>(
  ({ seconds }) => ({
    display: 'flex',
    width: 'max-content',
    animation: `${scrollX} ${seconds}s linear infinite`,
    '&:hover': { animationPlayState: 'paused' },
    /** Keyboard users get the same pause when a link inside takes focus. */
    '&:focus-within': { animationPlayState: 'paused' },
    [REDUCED_MOTION]: { animation: 'none' },
  }),
);

/**
 * Fixed width so the track measures deterministically - the loop depends on the
 * two halves being identical. The rule sits on every item rather than skipping
 * the first, as `DividedRow` does: in a loop, skipping one leaves a visible gap
 * in the pattern at the seam.
 */
const MarqueeItem = styled('div')({
  flex: '0 0 auto',
  width: 230,
  padding: '6px 26px',
  boxSizing: 'border-box',
  borderInlineStart: `1px solid ${C.ruleSoft}`,
  [BP.mobile]: { width: 178, padding: '6px 16px' },
});

export default function CustomerLogos({ title, items, bg, marquee }: CustomerLogosProps) {
  const cell = (c: Customer) => {
    const mark = c.logoUrl ? <LogoImg src={c.logoUrl} alt={c.name} loading="lazy" /> : null;
    return (
      <Col>
        <LogoBox>
          {c.linkUrl ? (
            <a href={c.linkUrl} target="_blank" rel="noreferrer">{mark}</a>
          ) : (
            mark
          )}
        </LogoBox>
        <Name>{c.name}</Name>
        {c.caption && <Caption>{c.caption}</Caption>}
      </Col>
    );
  };

  return (
    <Root bg={bg}>
      <Container>
        <H2>{title}</H2>
      </Container>

      {marquee ? (
        /* Full-bleed rather than inside `Container`, so the row runs edge to edge
           and the mask fades it out instead of stopping at a hard column edge. */
        <Reveal>
          <Viewport>
            {/* Doubled: the animation ends one full copy along, which is the same
                frame it started on, so the loop has no visible jump. Duration
                scales with the count to keep the speed constant as clients are
                added. The second copy is hidden from assistive tech. */}
            <Track seconds={Math.max(24, items.length * 5)}>
              {[...items, ...items].map((c, i) => (
                <MarqueeItem key={`${c.name}-${i}`} aria-hidden={i >= items.length}>
                  {cell(c)}
                </MarqueeItem>
              ))}
            </Track>
          </Viewport>
        </Reveal>
      ) : (
        <Container>
          <DividedRow min={175}>
            {items.map((c, i) => (
              <Reveal key={c.name} delay={i * 70}>
                {cell(c)}
              </Reveal>
            ))}
          </DividedRow>
        </Container>
      )}
    </Root>
  );
}
