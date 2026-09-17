import { styled } from '@mui/material/styles';
import { C, BP } from './tokens';
import { Container, H2, DividedRow } from './styled';
import Reveal from './Reveal';

export interface Customer {
  name: string;
  /** What the client did with Yooz - the caption under each logo. */
  caption?: string;
  logoUrl?: string;
  linkUrl?: string;
}

interface CustomerLogosProps {
  title: string;
  items: Customer[];
  /** Ground for the band. Home and Business run this on pink. */
  bg?: string;
}

const Root = styled('section')<{ bg?: string }>(({ bg }) => ({
  background: bg ?? 'transparent',
  paddingBlock: 62,
  [BP.mobile]: { paddingBlock: 40 },
}));

const Col = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 6,
});

const LogoBox = styled('div')({
  height: 76,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
});

const LogoImg = styled('img')({ maxHeight: 76, maxWidth: '100%', objectFit: 'contain' });

/** Measured: name ink 22px, caption two lines 32px apart at ~20px type. */
const Name = styled('div')({ fontSize: 22, fontWeight: 800, color: C.heading });

const Caption = styled('div')({ fontSize: 19.5, lineHeight: 1.55, color: C.ink, maxWidth: 250 });

export default function CustomerLogos({ title, items, bg }: CustomerLogosProps) {
  return (
    <Root bg={bg}>
      <Container>
        <H2>{title}</H2>
      </Container>
      <Container>
        <DividedRow min={175}>
          {items.map((c, i) => {
            const mark = c.logoUrl ? <LogoImg src={c.logoUrl} alt={c.name} loading="lazy" /> : null;
            return (
              <Reveal key={c.name} delay={i * 70}>
                <Col>
                  <LogoBox>
                    {c.linkUrl ? (
                      <a href={c.linkUrl} target="_blank" rel="noreferrer">{mark}</a>
                    ) : (
                      mark
                    )}
                  </LogoBox>
                  <Name>{c.name}</Name>
                  {c.caption && <Caption>{c.caption}</Caption>}
                </Col>
              </Reveal>
            );
          })}
        </DividedRow>
      </Container>
    </Root>
  );
}
