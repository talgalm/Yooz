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
  /**
   * `disc` is the Tourism treatment: a mascot illustration in a large pastel
   * circle. `inline` is the Business one, where the frame has no circle at all -
   * a ~26px line icon sits on the label's own line (icon x374, label x246, both
   * at y1504). Putting a line icon in the 118px disc scales it to ~97px.
   */
  iconVariant?: 'disc' | 'inline';
}

const Col = styled('div')<{ align: 'center' | 'start' }>(({ align }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align === 'center' ? 'center' : 'flex-start',
  textAlign: align === 'center' ? 'center' : 'start',
  gap: 8,
}));

/** Icon and label share a line in the Business treatment. */
const LabelRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 2,
});

const InlineIcon = styled('img')({
  width: 26,
  height: 26,
  objectFit: 'contain',
  flexShrink: 0,
});

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
export default function IconCardRow({
  items,
  min = 230,
  align = 'center',
  iconVariant = 'disc',
}: IconCardRowProps) {
  return (
    <Container>
      <DividedRow min={min}>
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <Col align={align}>
              {iconVariant === 'inline' ? (
                (item.iconUrl || item.label) && (
                  <LabelRow>
                    {item.iconUrl && <InlineIcon src={item.iconUrl} alt="" loading="lazy" />}
                    {item.label && <Label>{item.label}</Label>}
                  </LabelRow>
                )
              ) : (
                <>
                  {item.iconUrl && (
                    <IconDisc bg={item.iconBg} size={118}>
                      <img src={item.iconUrl} alt="" loading="lazy" />
                    </IconDisc>
                  )}
                  {item.label && <Label>{item.label}</Label>}
                </>
              )}
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
