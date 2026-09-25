import { styled } from '@mui/material/styles';
import { C, BP } from './tokens';
import { Container, DividedRow, IconDisc, TagPill, Body } from './styled';
import Reveal from './Reveal';

export interface IconCardItem {
  iconUrl?: string;
  iconBg?: string;
  label?: string;
  title: string;
  body: string;
  tag?: string;
}

interface IconCardRowProps {
  items: IconCardItem[];
  min?: number;
  align?: 'center' | 'start';
  iconVariant?: 'disc' | 'inline';
}

const Col = styled('div')<{ align: 'center' | 'start' }>(({ align }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align === 'center' ? 'center' : 'flex-start',
  textAlign: align === 'center' ? 'center' : 'start',
  gap: 8,
  [BP.mobile]: { alignItems: 'center', textAlign: 'center' },
}));

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
