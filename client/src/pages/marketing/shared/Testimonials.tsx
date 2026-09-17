import { styled } from '@mui/material/styles';
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
}

const Root = styled('section')({ paddingBlock: 56, [BP.mobile]: { paddingBlock: 36 } });

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
  width: 372,
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

const Stars = styled('div')({
  color: C.gold,
  fontSize: 14,
  letterSpacing: 2,
  marginBottom: 12,
  textAlign: 'end',
});

const Text = styled('blockquote')({
  margin: '0 0 20px',
  fontSize: 15,
  lineHeight: 1.75,
  color: C.ink,
  fontWeight: 500,
});

const Attribution = styled('figcaption')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexDirection: 'row-reverse',
  justifyContent: 'flex-start',
  fontSize: 12,
  color: C.inkSoft,
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

export default function Testimonials({ items }: TestimonialsProps) {
  return (
    <Root>
      <Container>
        <Row>
          {items.map((item, i) => (
            <Reveal key={item.author} delay={i * 90}>
              <Quote tilt={i % 2 === 0 ? -3 : 3} lift={i % 2 === 0 ? 0 : 18}>
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
    </Root>
  );
}
