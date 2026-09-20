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

/**
 * The figure as an isolated LTR run. `+50%` carries no strong character - `+` and
 * `%` are bidi-neutral and the digits are weak - so in the RTL page they resolve
 * against the paragraph direction and the leading `+` is pushed to the visual
 * right, rendering as `50%+`. The string is authored correctly; only the bidi
 * resolution is wrong.
 *
 * This sits on an inner inline span rather than on `Value` itself on purpose:
 * `direction: ltr` on the block would also resolve its `text-align: start` to the
 * left, and since `Item` is a flex column sized by the 150px label, that would
 * left-align the figure under a right-aligned Hebrew label.
 */
const Figure = styled('span')({ direction: 'ltr', unicodeBidi: 'isolate' });

const Label = styled('span')<{ onDark?: boolean }>(({ onDark }) => ({
  fontSize: 13,
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
