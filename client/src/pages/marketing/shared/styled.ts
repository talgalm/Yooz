/**
 * Shared styled primitives for the marketing site.
 *
 * Every page is assembled from these, so a change here lands on all four pages
 * at once. Page-specific one-offs stay in the page file.
 *
 * Geometry and colour come from the exported Figma frames - see `tokens.ts`.
 */

import { styled, keyframes } from '@mui/material/styles';
import { C, CTA_GRADIENT, TEXT_GRADIENT, SHADOW, RADIUS, CONTAINER, BP, REDUCED_MOTION } from './tokens';

// ─── Motion ───

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: none; }
`;

export const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
`;

/**
 * Ground for the scroll reveal. Starts faded and lifts in when `data-visible` is
 * set by the observer in `Reveal.tsx`. Reduced motion skips straight to the final
 * state rather than animating a shorter version of it.
 */
export const RevealRoot = styled('div')<{ delay?: number }>(({ delay = 0 }) => ({
  opacity: 0,
  transform: 'translateY(24px)',
  transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
  transitionDelay: `${delay}ms`,
  '&[data-visible="true"]': { opacity: 1, transform: 'none' },
  [REDUCED_MOTION]: { opacity: 1, transform: 'none', transition: 'none' },
}));

// ─── Layout ───

export const Page = styled('div')({
  background: C.paper,
  color: C.ink,
  minHeight: '100dvh',
  overflowX: 'clip',
});

/**
 * `max` overrides the shared column for one page. The Academy frame measures its
 * content at 1216 (cards 147..1365) where `CONTAINER` gives 1308, so that page
 * passes `max={1264}` - 1216 plus the 24 gutters. Left unset everywhere else.
 */
export const Container = styled('div', { shouldForwardProp: (p) => p !== 'max' })<{ max?: number }>(({ max }) => ({
  width: '100%',
  maxWidth: max ?? CONTAINER,
  marginInline: 'auto',
  paddingInline: 24,
  boxSizing: 'border-box',
  [BP.mobile]: { paddingInline: 18 },
}));

/**
 * A full-bleed band of colour. `Container` inside it holds the content column.
 * Relative so decorative shapes can be pinned to its edges.
 */
export const Band = styled('section')<{ bg?: string }>(({ bg }) => ({
  position: 'relative',
  background: bg ?? 'transparent',
  paddingBlock: 84,
  [BP.mobile]: { paddingBlock: 52 },
}));

// ─── Type ───

export const H1 = styled('h1')({
  fontSize: 'clamp(30px, 3.2vw, 48px)',
  fontWeight: 900,
  lineHeight: 1.4,
  letterSpacing: '-0.015em',
  color: C.heading,
  margin: '0 0 28px',
});

export const H2 = styled('h2')({
  fontSize: 'clamp(24px, 3vw, 44px)',
  fontWeight: 900,
  lineHeight: 1.22,
  textAlign: 'center',
  color: C.heading,
  margin: '0 0 12px',
});

export const H3 = styled('h3')({
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.35,
  color: C.heading,
  margin: '0 0 8px',
});

/** The magenta sweep used on the second line of every hero headline. */
export const GradientText = styled('span')({
  background: TEXT_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
});

/** Flat magenta alternative, for the smaller "דברו איתנו!" style lines. */
export const MagentaText = styled('span')({ color: C.magenta });

export const Lead = styled('p')({
  fontSize: 17,
  lineHeight: 1.68,
  color: C.ink,
  margin: '0 0 32px',
  [BP.mobile]: { fontSize: 15, lineHeight: 1.75 },
});

export const SectionIntro = styled('p')({
  fontSize: 15.5,
  lineHeight: 1.6,
  textAlign: 'center',
  color: C.inkSoft,
  maxWidth: 720,
  margin: '0 auto 44px',
  [BP.mobile]: { fontSize: 14.5, marginBottom: 30 },
});

export const Body = styled('p')({
  fontSize: 14,
  lineHeight: 1.75,
  color: C.inkSoft,
  margin: 0,
});

// ─── Buttons ───

/** Primary hero CTA: the purple-to-magenta sweep, soft rectangle not a pill. */
export const CtaButton = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: CTA_GRADIENT,
  color: C.white,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  padding: '18px 40px',
  minWidth: 240,
  boxSizing: 'border-box',
  fontSize: 16.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: SHADOW.button,
  transition: 'transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease',
  '&:hover': { transform: 'translateY(-2px)', filter: 'brightness(1.06)' },
  '&:active': { transform: 'translateY(0)' },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
  [BP.mobile]: { padding: '14px 28px', fontSize: 15, minWidth: 0 },
});

/** Flat violet button: nav, footer, and the contact form's submit. */
export const SolidButton = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.purple,
  color: C.white,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  padding: '12px 30px',
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'inherit',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.16s ease, transform 0.16s ease',
  '&:hover': { background: C.purpleDeep, transform: 'translateY(-1px)' },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
});

/** Outlined secondary action - "המודל העסקי" beside the hero CTA. */
export const GhostButton = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  background: C.white,
  color: C.heading,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  // Matches the primary button's box so the pair sits level.
  padding: '16.5px 38px',
  boxSizing: 'border-box',
  fontSize: 16.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  border: `1.5px solid ${C.purple}`,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.16s ease',
  '&:hover': { background: C.shell },
  [BP.mobile]: { padding: '12.5px 26px', fontSize: 15 },
});

/** Small outlined pill - the category tags under the Tourism cards. */
export const TagPill = styled('span')({
  display: 'inline-block',
  borderRadius: RADIUS.pill,
  border: `1px solid ${C.vennEngageEdge}`,
  background: C.white,
  color: C.purple,
  fontSize: 12,
  fontWeight: 700,
  padding: '6px 15px',
  whiteSpace: 'nowrap',
});

// ─── Cards ───

export const Card = styled('div')({
  background: C.white,
  borderRadius: RADIUS.card,
  boxShadow: SHADOW.card,
  padding: '26px 22px',
  boxSizing: 'border-box',
  height: '100%',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': { transform: 'translateY(-4px)', boxShadow: SHADOW.cardHover },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
});

export const CardGrid = styled('div', { shouldForwardProp: (p) => p !== 'min' && p !== 'gap' })<{
  min?: number;
  gap?: number;
}>(({ min = 210, gap = 20 }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap,
  alignItems: 'stretch',
  [BP.mobile]: { gap: 14 },
}));

/**
 * Divider-separated column row - the "?למי Yooz יתאים" and Tourism card rows are
 * columns split by hairlines, not floating cards. The rule sits on the inline
 * start edge so it never trails after the last column.
 */
export const DividedRow = styled('div')<{ min?: number }>(({ min = 220 }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 0,
  marginTop: 34,
  '& > * + *': { borderInlineStart: `1px solid ${C.ruleSoft}` },
  '& > *': { padding: '6px 26px' },
  [BP.mobile]: {
    '& > * + *': { borderInlineStart: 'none', borderTop: `1px solid ${C.ruleSoft}` },
    '& > *': { padding: '18px 8px' },
  },
}));

/**
 * Circular pastel disc behind a card icon or mascot.
 *
 * `imgSize` pins the child image to an exact px size. Without it the image fills
 * 82% of the disc, which is right for the Tourism mascots but blows a 30px line
 * icon up to ~47px - and because that is a class rule it silently overrides any
 * `width`/`height` attribute the caller puts on the `img`.
 */
export const IconDisc = styled('div')<{ bg?: string; size?: number; imgSize?: number }>(({ bg, size = 58, imgSize }) => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: bg ?? C.shell,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginInline: 'auto',
  marginBottom: 14,
  overflow: 'hidden',
  flexShrink: 0,
  '& img': {
    width: imgSize ?? '82%',
    height: imgSize ?? '82%',
    objectFit: 'contain',
  },
}));

/** Rounded-square icon tile - the Academy cards use these instead of discs. */
/** Tiles measure 48 square with a ~14 radius in the Academy frame; 44/12 is the older default. */
export const IconTile = styled('div', {
  shouldForwardProp: (p) => p !== 'bg' && p !== 'fg' && p !== 'size' && p !== 'radius',
})<{ bg?: string; fg?: string; size?: number; radius?: number }>(({ bg, fg, size = 44, radius = 12 }) => ({
  width: size,
  height: size,
  borderRadius: radius,
  background: bg ?? C.shell,
  color: fg ?? C.purple,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 19,
  flexShrink: 0,
}));

/** Numbered disc in the homepage sector lists. */
export const NumberDisc = styled('span')<{ bg?: string }>(({ bg }) => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: bg ?? C.discPink,
  color: C.discNumber,
  fontSize: 11,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: 2,
}));
