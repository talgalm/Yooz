import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { C, BP, REDUCED_MOTION } from './tokens';
import { Container, H2 } from './styled';

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqProps {
  title: string;
  items: FaqItem[];
  bg?: string;
}

const Root = styled('section')<{ bg?: string }>(({ bg }) => ({
  background: bg ?? C.paper,
  paddingBlock: 76,
  [BP.mobile]: { paddingBlock: 46 },
}));

const Title = styled(H2)({
  textAlign: 'start',
  marginBottom: 26,
});

const Row = styled('div')({
  '& + &::before': {
    content: '""',
    display: 'block',
    height: 1,
    background: C.ruleWarm,
    marginInlineStart: 66,
    marginInlineEnd: 90,
  },
});

const Head = styled('button')({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  padding: '26px 4px',
  fontSize: 22,
  fontWeight: 800,
  color: C.heading,
  '&:hover': { color: C.purple },
  [BP.mobile]: { fontSize: 16, padding: '18px 2px', gap: 12 },
});

const Toggle = styled('span')<{ open: boolean }>(({ open }) => ({
  flexShrink: 0,
  width: 27,
  height: 27,
  borderRadius: '50%',
  background: C.amber,
  color: C.heading,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 17,
  fontWeight: 700,
  lineHeight: 1,
  transition: 'transform 0.22s ease',
  transform: open ? 'rotate(135deg)' : 'none',
  [REDUCED_MOTION]: { transition: 'none' },
}));

const Panel = styled('div')<{ open: boolean }>(({ open }) => ({
  display: 'grid',
  gridTemplateRows: open ? '1fr' : '0fr',
  transition: 'grid-template-rows 0.28s ease',
  [REDUCED_MOTION]: { transition: 'none' },
}));

const PanelInner = styled('div')({ overflow: 'hidden' });

const Answer = styled('p')({
  margin: 0,
  padding: '0 4px 22px',
  paddingInlineEnd: 60,
  fontSize: 17,
  lineHeight: 1.8,
  color: C.inkSoft,
  [BP.mobile]: { paddingInlineEnd: 4, fontSize: 15 },
});

export default function Faq({ title, items, bg }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Root id="faq" bg={bg}>
      <Container>
        <Title>{title}</Title>
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <Row key={item.q}>
              <Head type="button" onClick={() => setOpenIndex(open ? null : i)} aria-expanded={open}>
                <Toggle open={open} aria-hidden>+</Toggle>
                <span>{item.q}</span>
              </Head>
              <Panel open={open}>
                <PanelInner>
                  <Answer>{item.a}</Answer>
                </PanelInner>
              </Panel>
            </Row>
          );
        })}
      </Container>
    </Root>
  );
}
