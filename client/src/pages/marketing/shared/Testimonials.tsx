import { styled } from '@mui/material/styles';
import { useLang } from '../../../context/LanguageContext';
import { C, SHADOW, BP, REDUCED_MOTION } from './tokens';
import { Container, H2 } from './styled';
import Reveal from './Reveal';

export interface Testimonial {
  quote: string;
  author: string;
  initials: string;
  avatarBg?: string;
}

interface TestimonialsProps {
  items: Testimonial[];
  title?: string;
  dense?: boolean;
  wash?: boolean;
}

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

const Content = styled('div')({ position: 'relative', zIndex: 1 });

const Root = styled('section', { shouldForwardProp: (p) => p !== 'wash' })<{ wash?: boolean }>(
  ({ wash }) => ({
    position: 'relative',
    overflow: 'hidden',
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

const Quote = styled('figure')<{ tilt: number; lift: number }>(({ tilt, lift }) => ({
  margin: 0,
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

const Stars = styled('div')({
  color: C.gold,
  fontSize: 14,
  letterSpacing: 2,
  marginBottom: 12,
  textAlign: 'start',
});

const Text = styled('blockquote', { shouldForwardProp: (p) => p !== 'dense' })<{ dense?: boolean }>(({ dense }) => ({
  margin: '0 0 20px',
  fontSize: dense ? 'clamp(15px, 1.35vw, 21px)' : 'clamp(16px, 1.5vw, 24px)',
  lineHeight: dense ? 1.4 : 1.35,
  color: C.ink,
  fontWeight: 400,
  [BP.mobile]: { fontSize: dense ? 15 : 16, lineHeight: 1.5 },
}));

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

export default function Testimonials({ items, title, dense, wash }: TestimonialsProps) {
  const { dir } = useLang();
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
        {title && <H2 style={{ marginBottom: 28 }}>{title}</H2>}
        <Row>
          {ordered.map((item, i) => (
            <Reveal key={item.author} delay={i * 90}>
              <Quote tilt={i % 2 === 0 ? 3 : -3} lift={i % 2 === 0 ? 18 : 0}>
                <Stars aria-label="5/5">★★★★★</Stars>
                <Text dense={dense}>{item.quote}</Text>
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
