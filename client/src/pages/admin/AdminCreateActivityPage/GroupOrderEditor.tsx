import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { SectionLabelSmall, SectionDescription } from '../styled';
import type { ModuleItem } from './types';

const Row = styled('div')<{ dragging?: boolean }>(({ dragging }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  background: dragging ? '#f5f0ff' : '#fff',
  fontSize: 13,
  cursor: 'grab',
  opacity: dragging ? 0.5 : 1,
}));

const GroupBlock = styled('div')({
  marginTop: 12,
  padding: 10,
  border: '1px solid #eee',
  borderRadius: 8,
  background: '#fafafa',
});

const GroupTitle = styled('div')({ fontWeight: 600, fontSize: 13, color: '#6c5ce7', marginBottom: 6 });
const List = styled('div')({ display: 'flex', flexDirection: 'column', gap: 4 });

const Handle = styled('span')({
  width: 12,
  height: 16,
  flexShrink: 0,
  cursor: 'grab',
  backgroundImage: 'radial-gradient(circle, #bbb 1.3px, transparent 1.3px)',
  backgroundSize: '5px 5px',
  backgroundPosition: 'center',
});

const Num = styled('span')({ color: '#999', fontSize: 12, width: 18, flexShrink: 0 });

const MissingLocation = styled('span')({
  marginInlineStart: 'auto',
  flexShrink: 0,
  background: '#fdeeea',
  color: '#c0392b',
  borderRadius: 6,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

function orderFor(items: ModuleItem[], group: string, saved?: number[]): number[] {
  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !item.groups?.length || item.groups.includes(group))
    .map(({ i }) => i);
  if (!saved?.length) return visible;

  const isVisible = new Set(visible);
  const taken = new Set<number>();
  const ordered: number[] = [];
  for (const i of saved) {
    if (isVisible.has(i) && !taken.has(i)) {
      ordered.push(i);
      taken.add(i);
    }
  }
  for (const i of visible) if (!taken.has(i)) ordered.push(i);
  return ordered;
}

export default function GroupOrderEditor({
  groupNames,
  items,
  orders,
  setOrders,
  selfService,
  t,
}: {
  groupNames: string[];
  items: ModuleItem[];
  orders: Record<string, number[]>;
  setOrders: (next: Record<string, number[]>) => void;
  selfService: boolean;
  t: Record<string, string>;
}) {
  const [drag, setDrag] = useState<{ group: string; from: number } | null>(null);

  if (selfService) {
    return (
      <div style={{ marginTop: 12 }}>
        <SectionLabelSmall>{t.mapGroupOrder}</SectionLabelSmall>
        <SectionDescription style={{ marginTop: 4 }}>{t.mapGroupOrderSelfService}</SectionDescription>
      </div>
    );
  }

  const move = (group: string, current: number[], from: number, to: number) => {
    if (from === to) return;
    const next = [...current];
    next.splice(to, 0, ...next.splice(from, 1));
    setOrders({ ...orders, [group]: next });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <SectionLabelSmall>{t.mapGroupOrder}</SectionLabelSmall>
      <SectionDescription style={{ marginTop: 4 }}>{t.mapGroupOrderHint}</SectionDescription>
      {groupNames.map((raw) => {
        const group = raw.trim() || 'Group';
        const order = orderFor(items, group, orders[group]);
        return (
          <GroupBlock key={group}>
            <GroupTitle>{group}</GroupTitle>
            <List>
              {order.map((itemIndex, pos) => (
                <Row
                  key={itemIndex}
                  draggable
                  dragging={drag?.group === group && drag.from === pos}
                  onDragStart={() => setDrag({ group, from: pos })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (drag?.group === group) move(group, order, drag.from, pos); setDrag(null); }}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => {
                    if (!drag || drag.group !== group) { setDrag({ group, from: pos }); return; }
                    move(group, order, drag.from, pos);
                    setDrag(null);
                  }}
                >
                  <Handle />
                  <Num>{pos + 1}.</Num>
                  <span>{items[itemIndex]?.name ?? '?'}</span>
                  {!items[itemIndex]?.location && (
                    <MissingLocation>{t.locationMissingLabel}</MissingLocation>
                  )}
                </Row>
              ))}
            </List>
          </GroupBlock>
        );
      })}
    </div>
  );
}
