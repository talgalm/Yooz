import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { C, SHADOW, RADIUS, BP } from './tokens';
import { Container, NumberDisc } from './styled';
import SectionShape, { type ShapeVariant } from './SectionShape';
import Reveal from './Reveal';

export interface FeatureItem {
  /** Lead-in run in bold, e.g. "שילוב משחקונים להנאת הלקוח:". */
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
  /**
   * Width/height the photo is cropped to in the comp. The source files are all
   * ~1.8 wide, but each band crops its own shape, and leaving them uncropped is
   * what makes a band look short.
   */
  mediaRatio?: number;
  /** Ground for the whole full-bleed band. */
  bg: string;
  /** Numbered disc fill - pink on the peach band, mint on the green one. */
  discBg?: string;
  /** Put the media on the other side, so stacked blocks alternate. */
  reverse?: boolean;
  /**
   * Which traced curve leads into this band. Each sector band in the comp enters
   * on its own asymmetric curve, so this is not interchangeable.
   */
  shape?: ShapeVariant;
}

const Band = styled('section')<{ bg: string }>(({ bg }) => ({
  position: 'relative',
  background: bg,
  paddingBlock: '20px 70px',
  [BP.mobile]: { paddingBlock: '10px 44px' },
}));

const ShapeWrap = styled('div')({ lineHeight: 0 });

/**
 * Measured from the frame: the photo runs x208..824 (616 wide) and the copy
 * x1026..1332 (306 wide), separated by a ~200px gutter, with the pair centred
 * inside the content column rather than filling it.
 */
const Split = styled('div')<{ reverse?: boolean }>(({ reverse }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 30,
  alignItems: 'center',
  '@media (min-width: 901px)': {
    maxWidth: 1130,
    marginInline: 'auto',
    /**
     * The template flips with `reverse`, not just the order - reordering alone
     * leaves the figure in the narrow column and collapses the photo.
     *
     * The reversed band is also not a mirror of the others:
     *   outer bands  photo 614-640, copy ~300, gutter 202
     *   middle band  photo 512,     copy 542,  gutter 40
     */
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

/** Measured: item blocks start 53px apart, each two lines ~20px apart. */
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

/**
 * Drawn rather than typed, for the same reason as the hero's marker: an arrow
 * character renders at whatever weight and baseline the fallback font decides.
 * `currentColor` keeps it on the link's colour through the hover change.
 */
function ArrowGlyph() {
  return (
    <svg
      width="15"
      height="12"
      viewBox="0 0 16 12"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M15 6H1m0 0 4.6-4.6M1 6l4.6 4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

// ─── Media ───

const Media = styled('figure')({ position: 'relative', margin: 0 });

/**
 * The comps sit each photo on an offset card in a deeper tint of the band, which
 * is what gives the blocks their depth. Pure decoration, so it is hidden from AT.
 */
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

/**
 * One row of the homepage's "מנוע אחד - שלושה מגזרים" stack: a full-bleed tinted
 * band entered through a shallow arc, with a numbered list on one side and a
 * photo on the other, alternating down the page.
 */
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
}: FeatureSplitProps) {
  return (
    <Band bg={bg}>
      {shape && (
        <ShapeWrap style={{ position: 'absolute', insetInline: 0, bottom: '100%' }}>
          <SectionShape color={bg} variant={shape} height={96} />
        </ShapeWrap>
      )}
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
  );
}
