import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { C, SHADOW, RADIUS, BP } from './tokens';
import { Container, NumberDisc } from './styled';
import SectionShape, { type ShapeVariant } from './SectionShape';
import Reveal from './Reveal';

export interface FeatureItem {
  bold: string;
  rest: string;
}

export interface FeatureSplitProps {
  title: string;
  items: FeatureItem[];
  linkLabel?: string;
  linkTo?: string;
  mediaUrl?: string;
  mediaAlt?: string;
  mediaRatio?: number;
  bg: string;
  discBg?: string;
  reverse?: boolean;
  shape?: ShapeVariant;
  shapeFrom?: string;
}

const Band = styled('section')<{ bg: string }>(({ bg }) => ({
  position: 'relative',
  background: bg,
  paddingBlock: '20px 70px',
  [BP.mobile]: { paddingBlock: '10px 44px' },
}));

const ShapeWrap = styled('div', { shouldForwardProp: (p) => p !== 'from' })<{ from?: string }>(({ from }) => ({
  lineHeight: 0,
  background: from ?? 'transparent',
}));

const Split = styled('div')<{ reverse?: boolean }>(({ reverse }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 30,
  alignItems: 'center',
  '@media (min-width: 901px)': {
    maxWidth: 1130,
    marginInline: 'auto',
    gridTemplateColumns: reverse ? '1fr 1.06fr' : '1fr 2fr',
    gap: reverse ? 40 : 'clamp(48px, 15vw, 200px)',
    '& > figure': { order: reverse ? -1 : 0 },
  },
}));

const Title = styled('h3')({
  fontSize: 'clamp(21px, 2.5vw, 30px)',
  fontWeight: 900,
  lineHeight: 1.3,
  color: C.heading,
  margin: '0 0 22px',
});

const List = styled('ol')({ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'grid', gap: 10 });

const Item = styled('li')({
  display: 'flex',
  gap: 11,
  alignItems: 'flex-start',
  fontSize: 13.5,
  lineHeight: 1.5,
  color: C.ink,
});

const Bold = styled('strong')({ fontWeight: 800, color: C.heading });

const Arrow = styled('svg')({
  flexShrink: 0,
  '[dir="ltr"] &': { transform: 'scaleX(-1)' },
});

export function ArrowGlyph() {
  return (
    <Arrow width="15" height="12" viewBox="0 0 16 12" fill="none" aria-hidden focusable="false">
      <path
        d="M15 6H1m0 0 4.6-4.6M1 6l4.6 4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Arrow>
  );
}

const MoreLink = styled(Link)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  color: C.purple,
  fontWeight: 800,
  fontSize: 14.5,
  textDecoration: 'none',
  '&:hover': { color: C.magenta },
});

const Media = styled('figure')({ position: 'relative', margin: 0 });

const Backing = styled('div')({
  position: 'absolute',
  inset: '-14px 14px 14px -14px',
  borderRadius: RADIUS.frame,
  background: 'rgba(255,255,255,0.45)',
  zIndex: 0,
});

const Shot = styled('img', { shouldForwardProp: (p) => p !== 'ratio' })<{ ratio?: number }>(({ ratio }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  height: 'auto',
  display: 'block',
  borderRadius: RADIUS.frame,
  boxShadow: SHADOW.cardHover,
  ...(ratio ? { aspectRatio: String(ratio), objectFit: 'cover' as const } : null),
}));

const ShotFallback = styled('div')({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  aspectRatio: '16 / 10',
  borderRadius: RADIUS.frame,
  background: C.white,
  boxShadow: SHADOW.cardHover,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: C.purple,
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'center',
  padding: 20,
});

export default function FeatureSplit({
  title,
  items,
  linkLabel,
  linkTo,
  mediaUrl,
  mediaAlt,
  mediaRatio,
  bg,
  discBg,
  reverse,
  shape,
  shapeFrom,
}: FeatureSplitProps) {
  return (
    <>
      {shape && (
        <ShapeWrap from={shapeFrom}>
          <SectionShape color={bg} variant={shape} height={96} />
        </ShapeWrap>
      )}
      <Band bg={bg}>
      <Container>
        <Reveal>
          <Split reverse={reverse}>
            <div>
              <Title>{title}</Title>
              <List>
                {items.map((item, i) => (
                  <Item key={item.bold}>
                    <NumberDisc bg={discBg}>{i + 1}</NumberDisc>
                    <span>
                      <Bold>{item.bold}</Bold> {item.rest}
                    </span>
                  </Item>
                ))}
              </List>
              {linkLabel && linkTo && (
                <MoreLink to={linkTo}>
                  {linkLabel}
                  <ArrowGlyph />
                </MoreLink>
              )}
            </div>

            <Media>
              <Backing aria-hidden />
              {mediaUrl ? (
                <Shot src={mediaUrl} alt={mediaAlt ?? ''} ratio={mediaRatio} loading="lazy" />
              ) : (
                <ShotFallback>{mediaAlt ?? title}</ShotFallback>
              )}
            </Media>
          </Split>
        </Reveal>
      </Container>
      </Band>
    </>
  );
}
