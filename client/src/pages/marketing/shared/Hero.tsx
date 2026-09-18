import { ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import { C, HERO_FADE, SHADOW, RADIUS, BP, REDUCED_MOTION } from './tokens';
import { Container, H1, Lead, CtaButton, GhostButton, GradientText, fadeUp } from './styled';
import SoftBlob from './SoftBlob';

/**
 * `plain` is the standard split hero: copy one side, art the other.
 * `photo` is the Academy variant: a full-bleed photograph with a violet wash
 * over the reading side and white copy laid on top.
 */
export type HeroTone = 'plain' | 'photo';

interface HeroProps {
  titleTop: string;
  /** Second line, carrying the magenta sweep. */
  titleBottom: string;
  titleThird?: string;
  lead?: string;
  bullets?: string[];
  primaryCta: string;
  primaryHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
  mediaUrl?: string;
  mediaAlt?: string;
  tone?: HeroTone;
  /** Cream and violet washes behind the art (Home). */
  blobs?: boolean;
  /** Rotated pink card behind the photo (Tourism). */
  pinkFrame?: boolean;
  /** Extra content under the actions, e.g. a StatStrip. */
  children?: ReactNode;
}

/**
 * The hero has no bottom edge. It dissolves into the section below over roughly
 * 180px - see `HERO_FADE`. Cutting it off with a flat rectangle is the single
 * most visible way to get this section wrong.
 */
const Root = styled('section')<{ tone: HeroTone }>(({ tone }) => ({
  position: 'relative',
  overflow: 'hidden',
  background: tone === 'photo' ? C.heading : HERO_FADE,
  // Measured: the art begins 14px under the 90px nav, so the top pad is small.
  paddingBlock: tone === 'photo' ? 0 : '16px 96px',
  [BP.mobile]: { paddingBlock: tone === 'photo' ? 0 : '18px 56px' },
}));

/**
 * Not a 50/50 split - the art takes the wider column, with the copy (first
 * child, so the right-hand side under RTL) narrower.
 *
 * Eased back from 1.95 to 1.6, which takes the art from ~66% of the row to ~62%
 * and hands the difference to the copy, where the bullet list was wrapping hard.
 */
const Split = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 34,
  alignItems: 'center',
  '@media (min-width: 901px)': { gridTemplateColumns: '1fr 1.6fr', gap: 28 },
});

const Copy = styled('div')({
  animation: `${fadeUp} 0.6s ease-out both`,
  [REDUCED_MOTION]: { animation: 'none' },
});

const Bullets = styled('ul')({ listStyle: 'none', margin: '0 0 30px', padding: 0, display: 'grid', gap: 13 });

const Bullet = styled('li')({
  position: 'relative',
  paddingInlineStart: 20,
  fontSize: 15.5,
  lineHeight: 1.75,
  color: C.ink,
  '&::before': {
    content: '""',
    position: 'absolute',
    insetInlineStart: 0,
    top: 10,
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: C.heading,
  },
  [BP.mobile]: { fontSize: 14.5 },
});

const Actions = styled('div')({ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' });

// ─── Art ───

/**
 * The washes are page-level, not part of the media column: measured against the
 * 1512-wide frame they run from the left edge to roughly 55% of the page.
 */
const BlobField = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  '@media (max-width: 900px)': { opacity: 0.75 },
});

const MediaWrap = styled('div')({
  position: 'relative',
  zIndex: 1,
  animation: `${fadeUp} 0.6s ease-out 0.12s both`,
  [REDUCED_MOTION]: { animation: 'none' },
});

/** The rotated pink card peeking out behind the Tourism photo. */
const PinkFrame = styled('div')({
  position: 'absolute',
  inset: '-16px -18px',
  background: C.vennShareEdge,
  borderRadius: 38,
  transform: 'rotate(-2.2deg)',
  zIndex: 0,
});

const MediaFrame = styled('div')({
  position: 'relative',
  zIndex: 1,
  borderRadius: RADIUS.frame,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const MediaImg = styled('img')({ width: '100%', height: 'auto', display: 'block' });

/** The Home art is a cut-out with its own transparency - no frame, no clipping. */
const BareImg = styled('img')({ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 1 });

const MediaFallback = styled('div')({
  width: '100%',
  aspectRatio: '4 / 3',
  borderRadius: RADIUS.frame,
  background: `linear-gradient(135deg, ${C.blobPurple}, ${C.vennShare})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: C.purple,
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'center',
  padding: 24,
});

// ─── Photo (Academy) variant ───

/** The hero frame is 1512 x 634 in the file. */
const PhotoStage = styled('div')({
  position: 'relative',
  minHeight: 634,
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  [BP.mobile]: { minHeight: 440 },
});

/**
 * Two layers, not one. The photograph carries its own gradient fill, whose
 * direction and strength both come from the file rather than being assumed:
 *
 *   handles  start=(0, 0.5) -> end=(1, 0.5)   i.e. horizontal, left to right
 *   stops    FFFFFF a0.00  ->  5B005B a1.00
 *   fill opacity 0.54                          i.e. never full strength
 *
 * So the end stop composites to 54% alpha, baked in here because CSS gradients
 * have no layer-opacity equivalent. Running it `to bottom` at full strength (an
 * earlier guess) darkened the foot of the hero and made the copy panel read as a
 * hard-edged box against it.
 */
const PhotoBg = styled('div')<{ src?: string }>(({ src }) => ({
  position: 'absolute',
  inset: 0,
  backgroundImage: src
    ? `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`
    : `linear-gradient(120deg, ${C.heading}, ${C.purpleDeep})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

/**
 * The copy panel: `SOLID 360A4D` at 78% opacity, inset rather than full-bleed.
 * In the file it runs x730..1512 and y224..723 of a hero starting at y89 - so it
 * floats against the right edge, clear of the top and bottom.
 */
const PhotoWash = styled('div')({
  position: 'absolute',
  right: 0,
  top: '21.3%',
  width: '51.7%',
  height: '78.7%',
  background: 'rgba(54,10,77,0.78)',
  /**
   * `radii=[75, 0, 0, 0]` in the file - only the top-left corner is rounded. The
   * panel is flush to the right frame edge and to its own foot, so that is the
   * one corner actually floating over the photograph.
   */
  borderStartEndRadius: 75,
  [BP.mobile]: { top: 0, width: '100%', height: '100%', borderStartEndRadius: 40 },
});

/** Text is right-aligned in the file (H1 at x757, lead at x826), not centred. */
const PhotoCopy = styled('div')({
  position: 'relative',
  zIndex: 1,
  maxWidth: 655,
  /**
   * `margin-inline-END: auto` to sit at the inline START, which under RTL is the
   * RIGHT edge - where the copy panel is. Using `margin-inline-start: auto` did
   * the opposite and threw the text to the left, away from its own panel.
   */
  marginInlineEnd: 'auto',
  /**
   * The panel's own padding in the file is `39/100/49/74`. Eased back to ~72 on
   * the inline start and opened up at the top by request - both deliberate steps
   * away from the measured values, so restore 100 / 39 if the file wins.
   */
  paddingInlineStart: 'clamp(24px, 4.8vw, 72px)',
  paddingBlock: '104px 70px',
  color: C.white,
  textAlign: 'start',
  animation: `${fadeUp} 0.6s ease-out both`,
  /** Academy sets its hero at 80/700/89 - larger and lighter than the shared H1. */
  '& h1': {
    color: C.white,
    fontSize: 'clamp(34px, 5.3vw, 80px)',
    fontWeight: 700,
    lineHeight: 1.11,
  },
  [REDUCED_MOTION]: { animation: 'none' },
});

/** 24 / 400 in the file - an earlier pass had this at 15.5. */
const PhotoLead = styled('p')({
  fontSize: 'clamp(16px, 1.6vw, 24px)',
  lineHeight: 1.35,
  color: 'rgba(255,255,255,0.92)',
  margin: '0 0 28px',
});

const WhiteCta = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.white,
  color: C.heading,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  // Button box is 215 x 68 with 24 / 500 type.
  padding: '20px 46px',
  minWidth: 215,
  boxSizing: 'border-box',
  fontSize: 24,
  fontWeight: 500,
  boxShadow: SHADOW.card,
  transition: 'transform 0.16s ease',
  '&:hover': { transform: 'translateY(-2px)' },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
});

/**
 * The marker on the secondary CTA. Drawn rather than typed: the `◁` character it
 * replaced is a font glyph, so its weight, size and vertical alignment were at
 * the mercy of whichever face happened to cover that codepoint. `currentColor`
 * keeps it locked to the button's text colour, including on hover.
 */
function PlayGlyph() {
  return (
    <svg
      width="16"
      height="18"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M9.2 1.8 2.9 6l6.3 4.2z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Hero({
  titleTop,
  titleBottom,
  titleThird,
  lead,
  bullets,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  mediaUrl,
  mediaAlt,
  tone = 'plain',
  blobs,
  pinkFrame,
  children,
}: HeroProps) {
  if (tone === 'photo') {
    return (
      <Root tone="photo">
        <PhotoStage>
          <PhotoBg src={mediaUrl} />
          <PhotoWash />
          <Container>
            <PhotoCopy>
              <H1>
                {titleTop}
                <br />
                {titleBottom}
              </H1>
              {lead && <PhotoLead>{lead}</PhotoLead>}
              <Actions>
                <WhiteCta href={primaryHref}>{primaryCta}</WhiteCta>
              </Actions>
              {children}
            </PhotoCopy>
          </Container>
        </PhotoStage>
      </Root>
    );
  }

  return (
    <Root tone="plain">
      {blobs && (
        <BlobField aria-hidden>
          {/* Positions traced from the frame: cream low-left, violet above it. */}
          <SoftBlob
            color={C.blobCream}
            intensity={0.95}
            softness={34}
            duration={30}
            style={{ left: '-4%', top: '26%', width: '48%', height: '78%' }}
          />
          <SoftBlob
            color={C.blobPurple}
            intensity={0.8}
            softness={38}
            duration={24}
            delay={-7}
            style={{ left: '5%', top: '2%', width: '52%', height: '86%' }}
          />
        </BlobField>
      )}

      <Container>
        <Split>
          <Copy>
            <H1>
              {titleTop}
              <br />
              <GradientText>{titleBottom}</GradientText>
              {titleThird && (
                <>
                  <br />
                  {titleThird}
                </>
              )}
            </H1>
            {lead && <Lead>{lead}</Lead>}
            {bullets && bullets.length > 0 && (
              <Bullets>
                {bullets.map((b) => (
                  <Bullet key={b}>{b}</Bullet>
                ))}
              </Bullets>
            )}
            <Actions>
              <CtaButton href={primaryHref}>{primaryCta}</CtaButton>
              {secondaryCta && (
                <GhostButton href={secondaryHref ?? primaryHref}>
                  <PlayGlyph />
                  {secondaryCta}
                </GhostButton>
              )}
            </Actions>
            {children}
          </Copy>

          <MediaWrap>
            {pinkFrame && <PinkFrame aria-hidden />}
            {blobs ? (
              mediaUrl ? <BareImg src={mediaUrl} alt={mediaAlt ?? ''} /> : null
            ) : (
              <MediaFrame>
                {mediaUrl ? (
                  <MediaImg src={mediaUrl} alt={mediaAlt ?? ''} />
                ) : (
                  <MediaFallback>{mediaAlt ?? 'Yooz'}</MediaFallback>
                )}
              </MediaFrame>
            )}
          </MediaWrap>
        </Split>
      </Container>
    </Root>
  );
}
