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

const PhotoStage = styled('div')({
  position: 'relative',
  minHeight: 520,
  display: 'flex',
  alignItems: 'center',
  [BP.mobile]: { minHeight: 400 },
});

const PhotoBg = styled('div')<{ src?: string }>(({ src }) => ({
  position: 'absolute',
  inset: 0,
  background: src ? `url(${src}) center/cover` : `linear-gradient(120deg, ${C.heading}, ${C.purpleDeep})`,
}));

const PhotoWash = styled('div')({
  position: 'absolute',
  inset: 0,
  background: `linear-gradient(to left, ${C.heading} 4%, rgba(56,8,80,0.88) 34%, rgba(56,8,80,0.12) 72%, rgba(56,8,80,0) 100%)`,
});

const PhotoCopy = styled('div')({
  position: 'relative',
  zIndex: 1,
  maxWidth: 560,
  marginInlineStart: 'auto',
  paddingBlock: 70,
  color: C.white,
  animation: `${fadeUp} 0.6s ease-out both`,
  '& h1': { color: C.white },
  [REDUCED_MOTION]: { animation: 'none' },
});

const PhotoLead = styled('p')({
  fontSize: 15.5,
  lineHeight: 1.85,
  color: 'rgba(255,255,255,0.9)',
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
  padding: '15px 46px',
  fontSize: 16,
  fontWeight: 800,
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
