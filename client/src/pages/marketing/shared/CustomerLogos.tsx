import { useEffect, useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { C, BP, REDUCED_MOTION } from './tokens';
import { Container, H2, DividedRow } from './styled';
import Reveal from './Reveal';

export interface Customer {
  name: string;
  caption?: string;
  logoUrl?: string;
  linkUrl?: string;
}

interface CustomerLogosProps {
  title: string;
  items: Customer[];
  bg?: string;
  marquee?: boolean;
}

const fadeOut = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'transparent';
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
};

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

const LogoBox = styled('div')({
  height: 'var(--logo-h, 76px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
});

const LogoImg = styled('img')({ maxHeight: 'var(--logo-h, 76px)', maxWidth: '100%', objectFit: 'contain' });

const Name = styled('div')({ fontSize: 'var(--logo-name, 22px)', fontWeight: 800, color: C.heading });

const Caption = styled('div')({ fontSize: 19.5, lineHeight: 1.55, color: C.ink, maxWidth: 250, textWrap: 'balance' });

const scrollX = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
`;

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
    '&:focus-within': { animationPlayState: 'paused' },
    [REDUCED_MOTION]: { animation: 'none' },
  }),
);

const MARQUEE_CELL = 300;

const MARQUEE_SPEED = 25;

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
        <Reveal>
          <Viewport ref={viewportRef}>
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
