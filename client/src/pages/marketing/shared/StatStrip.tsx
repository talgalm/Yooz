import { styled } from '@mui/material/styles';
import { C, BP } from './tokens';

export interface Stat {
  /** The headline figure, e.g. "1.5x" or "+50%". */
  value: string;
  label: string;
}

interface StatStripProps {
  items: Stat[];
  onDark?: boolean;
}

const Root = styled('div')({ marginTop: 30 });

/** The comps rule this off from the actions above it. */
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

const Label = styled('span')<{ onDark?: boolean }>(({ onDark }) => ({
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: 150,
  color: onDark ? 'rgba(255,255,255,0.82)' : C.inkSoft,
}));

/** The "1.5x / +50% / 2x" proof row under the Tourism hero. */
export default function StatStrip({ items, onDark }: StatStripProps) {
  return (
    <Root>
      <Rule />
      <Row>
        {items.map((s) => (
          <Item key={s.label}>
            <Value onDark={onDark}>{s.value}</Value>
            <Label onDark={onDark}>{s.label}</Label>
          </Item>
        ))}
      </Row>
    </Root>
  );
}
