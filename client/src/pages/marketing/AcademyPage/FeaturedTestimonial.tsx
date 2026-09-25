import { styled } from '@mui/material/styles';
import { C, SHADOW, BP } from '../shared/tokens';
import { Container, H2 } from '../shared/styled';
import Reveal from '../shared/Reveal';
import { QuoteMark } from './FeaturedTestimonial.icons';

export interface FeaturedQuote {
  paragraphs: string[];
  name: string;
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

const Paragraph = styled('p')({
  margin: '0 0 14px',
  fontSize: 17.5,
  lineHeight: 1.75,
  color: C.ink,
  '&:last-child': { marginBottom: 0 },
  [BP.mobile]: { fontSize: 15.5, lineHeight: 1.7 },
});

const Signature = styled('figcaption')({
  background: C.cardTint,
  padding: '40px 36px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
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
  '&:last-child': { fontWeight: 700, color: C.heading, marginTop: 4 },
});

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
