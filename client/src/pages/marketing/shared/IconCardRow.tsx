import { styled } from '@mui/material/styles';
import { C, BP } from './tokens';
import { Container, DividedRow, IconDisc, TagPill, Body } from './styled';
import Reveal from './Reveal';

export interface IconCardItem {
  /** Mascot illustration or icon. */
  iconUrl?: string;
  iconBg?: string;
  /** Small coloured label above the title. */
  label?: string;
  title: string;
  body: string;
  /** Outlined pill under the body. */
  tag?: string;
}

interface IconCardRowProps {
  items: IconCardItem[];
  min?: number;
  /** Centre the icon over the copy (Tourism) rather than sitting inline. */
  align?: 'center' | 'start';
}

const Col = styled('div')<{ align: 'center' | 'start' }>(({ align }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align === 'center' ? 'center' : 'flex-start',
  textAlign: align === 'center' ? 'center' : 'start',
  gap: 8,
}));

const Label = styled('span')({
  fontSize: 11.5,
  fontWeight: 800,
  color: C.purple,
  letterSpacing: '0.02em',
});

const Title = styled('h3')({
  fontSize: 16.5,
  fontWeight: 800,
  lineHeight: 1.35,
  color: C.heading,
  margin: 0,
  [BP.mobile]: { fontSize: 15.5 },
});

/**
 * The divider-separated column rows used by Business ("?למי Yooz יתאים") and
 * Tourism. These are columns split by hairlines, not floating cards - the comps
 * have no card surface here at all.
 */
export default function IconCardRow({ items, min = 230, align = 'center' }: IconCardRowProps) {
  return (
    <Container>
      <DividedRow min={min}>
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <Col align={align}>
              {item.iconUrl && (
                <IconDisc bg={item.iconBg} size={118}>
                  <img src={item.iconUrl} alt="" loading="lazy" />
                </IconDisc>
              )}
              {item.label && <Label>{item.label}</Label>}
              <Title>{item.title}</Title>
              <Body>{item.body}</Body>
              {item.tag && <TagPill style={{ marginTop: 6 }}>{item.tag}</TagPill>}
            </Col>
          </Reveal>
        ))}
      </DividedRow>
    </Container>
  );
}
