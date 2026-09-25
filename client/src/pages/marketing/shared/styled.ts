
import { styled, keyframes } from '@mui/material/styles';
import { C, CTA_GRADIENT, TEXT_GRADIENT, SHADOW, RADIUS, CONTAINER, BP, REDUCED_MOTION } from './tokens';

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: none; }
`;

export const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
`;

export const RevealRoot = styled('div')<{ delay?: number }>(({ delay = 0 }) => ({
  opacity: 0,
  transform: 'translateY(24px)',
  transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
  transitionDelay: `${delay}ms`,
  '&[data-visible="true"]': { opacity: 1, transform: 'none' },
  [REDUCED_MOTION]: { opacity: 1, transform: 'none', transition: 'none' },
}));

export const Page = styled('div')({
  background: C.paper,
  color: C.ink,
  minHeight: '100dvh',
  overflowX: 'clip',
  textAlign: 'start',
  '& input, & textarea, & select': { direction: 'inherit', textAlign: 'start' },
});

export const Container = styled('div', { shouldForwardProp: (p) => p !== 'max' })<{ max?: number }>(({ max }) => ({
  width: '100%',
  maxWidth: max ?? CONTAINER,
  marginInline: 'auto',
  paddingInline: 24,
  boxSizing: 'border-box',
  [BP.mobile]: { paddingInline: 18 },
}));

export const Band = styled('section')<{ bg?: string }>(({ bg }) => ({
  position: 'relative',
  background: bg ?? 'transparent',
  paddingBlock: 84,
  [BP.mobile]: { paddingBlock: 52 },
}));

export const H1 = styled('h1')({
  fontSize: 'clamp(44px, 3.4vw, 54px)',
  fontWeight: 900,
  lineHeight: 1.4,
  letterSpacing: '-0.015em',
  color: C.heading,
  margin: '0 0 28px',
  [BP.mobile]: { fontSize: 48, lineHeight: 1.18, marginBottom: 22 },
  '[dir="ltr"] &': {
    fontSize: 'clamp(33px, 3vw, 50px)',
    [BP.mobile]: { fontSize: 33, lineHeight: 1.16 },
  },
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

export const GradientText = styled('span')({
  background: TEXT_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
});

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
  [BP.mobile]: { fontSize: 15, marginBottom: 30 },
});

export const Body = styled('p')({
  fontSize: 15,
  lineHeight: 1.75,
  color: C.inkSoft,
  margin: 0,
  [BP.mobile]: { fontSize: 15.5, lineHeight: 1.7 },
});

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

export const GhostButton = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  background: C.white,
  color: C.heading,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
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
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap,
  alignItems: 'stretch',
  [BP.mobile]: { gap: 14 },
}));

export const DividedRow = styled('div')<{ min?: number }>(({ min = 220 }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap: 0,
  marginTop: 34,
  '& > * + *': { borderInlineStart: `1px solid ${C.ruleSoft}` },
  '& > *': { padding: '6px 26px' },
  [BP.mobile]: {
    '& > * + *': { borderInlineStart: 'none', borderTop: `1px solid ${C.ruleSoft}` },
    '& > *': { padding: '18px 8px' },
    '& > *:last-child:nth-child(odd)': { gridColumn: '1 / -1' },
  },
}));

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
