import { styled } from '@mui/material/styles';
import { useLang } from '../../../context/LanguageContext';
import { C, SHADOW, BP, REDUCED_MOTION } from './tokens';
import { Container } from './styled';
import Reveal from './Reveal';

export interface Testimonial {
  quote: string;
  author: string;
  /** Two-letter monogram for the avatar disc. */
  initials: string;
  /** Avatar fill - the comps alternate a mint and a violet. */
  avatarBg?: string;
}

interface TestimonialsProps {
  items: Testimonial[];
  /**
   * Paint the soft pink field behind the cards. Off by default: Business,
   * Tourism and Academy share this component and sit on their own grounds.
   */
  wash?: boolean;
}

/**
 * The pink field behind the cards, traced column by column off the Home frame.
 * Fill is #FFE8FF on #FFFAFF ground. Its top edge dips to a low around x660
 * before climbing steeply to the right, and its underside bellies out to a
 * maximum near x1127 - both edges curve, so this is a closed shape rather than
 * one of `SectionShape`'s single-edge dividers.
 *
 * Columns x427..520 scan a false bottom around y4940 because the white cards
 * occlude the fill there; those three are interpolated, not measured.
 */
const WASH_PATH =
  'M0,68 C230,160 460,310 690,339 C920,335 1230,230 1512,0 L1512,795 C1400,820 1250,842 1127,843 C800,825 400,720 0,370 Z';

const Wash = styled('svg')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
  pointerEvents: 'none',
});

/** Lifts the cards above the wash. Without it the SVG paints over them. */
const Content = styled('div')({ position: 'relative', zIndex: 1 });

/**
 * In the frame the field runs y4517..5360 with the cards at y4940..5292 - far
 * more room above them than below. The padding reproduces that proportion; the
 * shape stays inside this section rather than reaching up behind the contact
 * form, which is where it starts in the comp.
 */
const Root = styled('section', { shouldForwardProp: (p) => p !== 'wash' })<{ wash?: boolean }>(
  ({ wash }) => ({
    position: 'relative',
    overflow: 'hidden',
    /**
     * No background here on purpose. `Page` already grounds everything in
     * `paper`, which is what the wash reads against, so setting it again only
     * made this section opaque - and it then painted over the contact form's
     * drop shadow above it and cut it off along a hard horizontal line.
     */
    paddingBlock: wash ? '110px 90px' : 56,
    [BP.mobile]: { paddingBlock: wash ? '52px 50px' : 36 },
  }),
);

const Row = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  gap: 0,
  flexWrap: 'wrap',
  [BP.mobile]: { gap: 16 },
});

/**
 * The comps tilt the cards in opposite directions and let them overlap slightly.
 * Below the mobile breakpoint they straighten and separate - rotation plus a
 * narrow column reads as a layout bug rather than a flourish.
 */
const Quote = styled('figure')<{ tilt: number; lift: number }>(({ tilt, lift }) => ({
  margin: 0,
  // Widened to carry the 24px quote without the cards turning into narrow columns.
  width: 440,
  maxWidth: '100%',
  background: C.white,
  borderRadius: 18,
  padding: '24px 26px 20px',
  boxShadow: SHADOW.quote,
  transform: `rotate(${tilt}deg) translateY(${lift}px)`,
  transition: 'transform 0.25s ease',
  '&:hover': { transform: 'rotate(0deg) translateY(-6px)', zIndex: 2 },
  [BP.mobile]: { transform: 'none', width: '100%' },
  [REDUCED_MOTION]: { transform: 'none', transition: 'none' },
}));

/**
 * Stars sit at the card's right edge. Under RTL `start` IS the right, so `end`
 * was pushing them to the left - the opposite of the frame, where they run
 * x1009..x1085 in a card ending at x1113.
 */
const Stars = styled('div')({
  color: C.gold,
  fontSize: 14,
  letterSpacing: 2,
  marginBottom: 12,
  textAlign: 'start',
});

/** 24 / 400 in the file - an earlier pass had this at 15 / 500. */
const Text = styled('blockquote')({
  margin: '0 0 20px',
  fontSize: 'clamp(16px, 1.5vw, 24px)',
  lineHeight: 1.35,
  color: C.ink,
  fontWeight: 400,
  [BP.mobile]: { fontSize: 16, lineHeight: 1.5 },
});

/** Attribution is 20 / 300 in the file; the avatar monogram is 14 / 700. */
/**
 * The avatar sits to the RIGHT of the attribution text (avatar x705 against text
 * x428 in the frame). Under RTL a plain `row` already places the first child on
 * the right, so the `row-reverse` an earlier pass added was actively undoing the
 * base direction and throwing the circle to the left.
 */
const Attribution = styled('figcaption')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  justifyContent: 'flex-start',
  fontSize: 'clamp(13px, 1.2vw, 20px)',
  fontWeight: 300,
  color: C.inkSoft,
  [BP.mobile]: { fontSize: 13 },
});

const Avatar = styled('span')<{ bg?: string }>(({ bg }) => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: bg ?? C.vennEngage,
  color: C.heading,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10.5,
  fontWeight: 800,
  flexShrink: 0,
}));

export default function Testimonials({ items, wash }: TestimonialsProps) {
  const { dir } = useLang();
  /**
   * Only reverse under RTL. A flex row puts its first child on the right there,
   * but in the frame items[0] is the LEFT card, so the pair needs flipping to
   * keep each quote with its own author. Under LTR the array order is already
   * the visual order and reversing it re-introduces exactly that bug.
   */
  const ordered = dir === 'rtl' ? [...items].reverse() : items;

  return (
    <Root wash={wash}>
      {wash && (
        <Wash viewBox="0 0 1512 843" preserveAspectRatio="none" aria-hidden focusable="false">
          <path d={WASH_PATH} fill={C.shell} />
        </Wash>
      )}
      <Content>
        <Container>
        <Row>
          {/*
            Reversed for RTL: the first child of a flex row lands on the RIGHT,
            but in the frame items[0] is the LEFT card (Frame 29 at x372, the
            college-lecturer quote). Rendering in array order mirrored the pair,
            which reads as the wrong person saying each quote.
          */}
          {ordered.map((item, i) => (
            <Reveal key={item.author} delay={i * 90}>
              <Quote tilt={i % 2 === 0 ? 3 : -3} lift={i % 2 === 0 ? 18 : 0}>
                <Stars aria-label="5/5">★★★★★</Stars>
                <Text>{item.quote}</Text>
                <Attribution>
                  <Avatar bg={item.avatarBg} aria-hidden>{item.initials}</Avatar>
                  <span>{item.author}</span>
                </Attribution>
              </Quote>
            </Reveal>
          ))}
          </Row>
        </Container>
      </Content>
    </Root>
  );
}
