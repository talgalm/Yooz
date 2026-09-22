import { styled } from '@mui/material/styles';
import { C, SHADOW, BP } from '../shared/tokens';
import { Container, H2 } from '../shared/styled';
import Reveal from '../shared/Reveal';

export interface FeaturedQuote {
  paragraphs: string[];
  name: string;
  /** Signature lines under the name, as the client signs them. */
  roles: string[];
  logoUrl?: string;
  logoAlt?: string;
}

interface FeaturedTestimonialProps {
  title: string;
  quote: FeaturedQuote;
}

const Root = styled('section')({
  paddingBlock: '64px 72px',
  [BP.mobile]: { paddingBlock: '40px 44px' },
});

const Title = styled(H2)({ marginBottom: 36, [BP.mobile]: { marginBottom: 24 } });

/**
 * One wide card: the quote, then a signature panel. Two columns from 901px;
 * below that the signature stacks under the quote.
 */
const Card = styled('figure')({
  margin: '0 auto',
  maxWidth: 1060,
  background: C.white,
  borderRadius: 24,
  boxShadow: SHADOW.quote,
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: '1fr',
  '@media (min-width: 901px)': { gridTemplateColumns: '1.75fr 1fr' },
});

/**
 * The rule between the columns sits on the quote's inline end - the left edge
 * under RTL, the right under LTR - so it always lands between the two. On a
 * phone it becomes the line above the signature.
 */
const QuoteSide = styled('div')({
  padding: '40px 44px 36px',
  borderBottom: `1px solid ${C.cardRule}`,
  '@media (min-width: 901px)': { borderBottom: 'none', borderInlineEnd: `1px solid ${C.cardRule}` },
  [BP.mobile]: { padding: '28px 22px 24px' },
});

const Head = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 18,
});

const Stars = styled('div')({ color: C.gold, fontSize: 15, letterSpacing: 2 });

/** Filled marks, not a typed glyph: a font's quotation mark changes shape and weight by fallback. */
function QuoteMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M4.5 6.5h6v6l-2.6 5H5.1l2.1-5H4.5zM13.5 6.5h6v6l-2.6 5h-2.8l2.1-5h-2.7z" fill={C.blobPurple} />
    </svg>
  );
}

const Paragraph = styled('p')({
  margin: '0 0 14px',
  fontSize: 17.5,
  lineHeight: 1.75,
  color: C.ink,
  '&:last-child': { marginBottom: 0 },
  [BP.mobile]: { fontSize: 15.5, lineHeight: 1.7 },
});

/**
 * The signature follows the page direction: aligned to the inline start, which
 * is the right under Hebrew. Centred on a phone, where it stacks under the quote.
 */
const Signature = styled('figcaption')({
  background: C.cardTint,
  padding: '40px 36px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  /** `flex-start`, not the default `stretch`, or the logo is stretched to the panel width. */
  alignItems: 'flex-start',
  textAlign: 'start',
  [BP.mobile]: { padding: '26px 22px 28px', textAlign: 'center', alignItems: 'center' },
});

const Logo = styled('img')({
  display: 'block',
  maxHeight: 54,
  maxWidth: 200,
  objectFit: 'contain',
  marginBottom: 20,
});

const Name = styled('div')({
  fontSize: 19,
  fontWeight: 800,
  color: C.purple,
  marginBottom: 10,
});

const Roles = styled('ul')({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 3 });

const Role = styled('li')({
  fontSize: 13.5,
  lineHeight: 1.5,
  color: C.inkSoft,
  /** The institution closes the list and carries the weight. */
  '&:last-child': { fontWeight: 700, color: C.heading, marginTop: 4 },
});

/**
 * A single named testimonial for the Academy page. The shared `Testimonials`
 * lays out a tilted pair of short anonymous quotes; a long quote with a full
 * signature needs a card of its own.
 */
export default function FeaturedTestimonial({ title, quote }: FeaturedTestimonialProps) {
  return (
    <Root>
      <Container>
        <Title>{title}</Title>
        <Reveal>
          <Card>
            <QuoteSide>
              <Head>
                <Stars aria-label="5/5">★★★★★</Stars>
                <QuoteMark />
              </Head>
              <blockquote style={{ margin: 0 }}>
                {quote.paragraphs.map((p) => (
                  <Paragraph key={p.slice(0, 24)}>{p}</Paragraph>
                ))}
              </blockquote>
            </QuoteSide>

            <Signature>
              {quote.logoUrl && <Logo src={quote.logoUrl} alt={quote.logoAlt ?? ''} loading="lazy" />}
              <Name>{quote.name}</Name>
              <Roles>
                {quote.roles.map((r) => (
                  <Role key={r}>{r}</Role>
                ))}
              </Roles>
            </Signature>
          </Card>
        </Reveal>
      </Container>
    </Root>
  );
}
