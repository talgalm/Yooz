import { styled } from '@mui/material/styles';
import { C, BP } from './tokens';

export interface Stat {
  value: string;
  label: string;
}

interface StatStripProps {
  items: Stat[];
  onDark?: boolean;
}

const Root = styled('div')({ marginTop: 30 });

const Rule = styled('div')({ height: 1, background: C.ruleSoft, marginBottom: 20 });

const Row = styled('div')({
  display: 'flex',
  gap: 44,
  flexWrap: 'wrap',
  [BP.mobile]: { gap: 24 },
});

const Item = styled('div')({ display: 'flex', flexDirection: 'column', gap: 3 });

const Value = styled('span')<{ onDark?: boolean }>(({ onDark }) => ({
  fontSize: 25,
  fontWeight: 900,
  lineHeight: 1.1,
  color: onDark ? C.white : C.heading,
  [BP.mobile]: { fontSize: 21 },
}));

const Figure = styled('span')({ direction: 'ltr', unicodeBidi: 'isolate' });

const Label = styled('span')<{ onDark?: boolean }>(({ onDark }) => ({
  fontSize: 13,
  lineHeight: 1.5,
  maxWidth: 150,
  color: onDark ? 'rgba(255,255,255,0.82)' : C.inkSoft,
}));

export default function StatStrip({ items, onDark }: StatStripProps) {
  return (
    <Root>
      <Rule />
      <Row>
        {items.map((s) => (
          <Item key={s.label}>
            <Value onDark={onDark}>
              <Figure>{s.value}</Figure>
            </Value>
            <Label onDark={onDark}>{s.label}</Label>
          </Item>
        ))}
      </Row>
    </Root>
  );
}
