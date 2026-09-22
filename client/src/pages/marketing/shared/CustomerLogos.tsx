import { useEffect, useRef, useState } from 'react';
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

/** `#RRGGBB` at zero alpha. The `transparent` keyword is `rgba(0,0,0,0)` and greys the gradient's middle. */
const fadeOut = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'transparent';
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
};

/** Fades to nothing rather than to a named colour, so this need not know what follows it. */
const Root = styled('section')<{ bg?: string }>(({ bg }) => ({
  background: bg ? `linear-gradient(to bottom, ${bg} 0%, ${bg} 70%, ${fadeOut(bg)} 100%)` : 'transparent',
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

/**
 * Logo and name sizes read custom properties so the marquee can run them larger
 * (see `MarqueeItem`) while the static row keeps the frame's measured sizes as
 * the fallbacks.
 */
const LogoBox = styled('div')({
  height: 'var(--logo-h, 76px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
});

const LogoImg = styled('img')({ maxHeight: 'var(--logo-h, 76px)', maxWidth: '100%', objectFit: 'contain' });

/** Measured: name ink 22px, caption two lines 32px apart at ~20px type. */
const Name = styled('div')({ fontSize: 'var(--logo-name, 22px)', fontWeight: 800, color: C.heading });

const Caption = styled('div')({ fontSize: 19.5, lineHeight: 1.55, color: C.ink, maxWidth: 250 });

// ─── Marquee ───

const scrollX = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
`;

/**
 * LTR on purpose: under RTL the overflow runs off the left, so -50% slides the
 * content away instead of looping. Each column centres its own text, so the
 * Hebrew still reads correctly inside.
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

/** Desktop cell width. Wide on purpose: with only a handful of clients, a dense row makes the repeat obvious. */
const MARQUEE_CELL = 300;

/**
 * Pixels per second. Speed is fixed rather than derived from the client count,
 * so a phone and a wide screen scroll at the same calm pace.
 */
const MARQUEE_SPEED = 25;

/**
 * Fixed width so the two halves measure identically, which the loop depends on.
 * The rule sits on every item - skipping the first, as `DividedRow` does, leaves
 * a gap in the pattern at the seam.
 */
const MarqueeItem = styled('div')({
  flex: '0 0 auto',
  width: MARQUEE_CELL,
  padding: '10px 40px',
  boxSizing: 'border-box',
  borderInlineStart: `1px solid ${C.ruleSoft}`,
  '--logo-h': '100px',
  '--logo-name': '24px',
  [BP.mobile]: { width: 220, padding: '8px 22px', '--logo-h': '84px', '--logo-name': '21px' },
});

/**
 * How many times the client list repeats inside ONE half of the marquee track,
 * and how long that half takes to scroll past.
 *
 * The track is two identical halves and the animation slides it by exactly one
 * half, so the loop is only seamless while a half is at least as wide as the
 * viewport - otherwise the trailing edge comes into view and an empty strip
 * opens on the right before the loop resets. Measured, not guessed: the cell
 * width changes at the mobile breakpoint and the viewport changes on resize.
 */
function useMarqueeLayout(enabled: boolean, count: number) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ reps: 1, setWidth: count * MARQUEE_CELL });

  useEffect(() => {
    const vp = viewportRef.current;
    if (!enabled || !vp || count === 0) return;

    const measure = () => {
      const cell = vp.querySelector<HTMLElement>('[data-marquee-item]');
      const setWidth = (cell?.offsetWidth ?? 0) * count;
      if (setWidth <= 0) return;
      const reps = Math.max(1, Math.ceil(vp.clientWidth / setWidth));
      setLayout((prev) => (prev.reps === reps && prev.setWidth === setWidth ? prev : { reps, setWidth }));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [enabled, count]);

  const seconds = (layout.setWidth * layout.reps) / MARQUEE_SPEED;
  return { viewportRef, reps: layout.reps, seconds };
}

export default function CustomerLogos({ title, items, bg, marquee }: CustomerLogosProps) {
  const { viewportRef, reps, seconds } = useMarqueeLayout(Boolean(marquee), items.length);
  /** One half of the track: the list, repeated until it spans the viewport. */
  const half = Array.from({ length: reps }, () => items).flat();

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
          <Viewport ref={viewportRef}>
            {/* Two identical halves: the animation ends one half along, which is
                the same frame it started on, so the loop has no visible jump. Each
                half is the list repeated `reps` times so it always spans the
                viewport, and its duration comes from its measured length at
                `MARQUEE_SPEED` (see `useMarqueeLayout`). Only the first copy of
                the list is exposed to assistive tech. */}
            <Track seconds={seconds}>
              {[...half, ...half].map((c, i) => (
                <MarqueeItem key={`${c.name}-${i}`} data-marquee-item aria-hidden={i >= items.length}>
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
