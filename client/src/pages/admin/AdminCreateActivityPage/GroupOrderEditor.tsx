import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { SectionLabelSmall, SectionDescription } from '../styled';
import type { ModuleItem } from './types';

/**
 * Per-group visiting order for a map module.
 *
 * Only preset groups can be ordered: self-service teams don't exist until
 * participants create them on the day, so there is nothing to attach an order
 * to — those activities all walk the item list's own order.
 *
 * An order is a permutation of indices into `items`. Items a group can't see
 * (item-level group visibility) are left out; the server drops anything stale.
 */
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
const Handle = styled('span')({ color: '#bbb', flexShrink: 0 });
const Num = styled('span')({ color: '#999', fontSize: 12, width: 18, flexShrink: 0 });

/** Indices of `items` this group actually sees, in the group's saved order. */
function orderFor(items: ModuleItem[], group: string, saved?: number[]): number[] {
  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !item.groups?.length || item.groups.includes(group))
    .map(({ i }) => i);
  if (!saved?.length) return visible;

  // Same rule the server applies (utils/moduleItems.ts): a saved order is a
  // hint, so unknown/duplicate entries are dropped and anything it forgot keeps
  // its stored place at the end. Duplicated across the client/server boundary
  // because there is no shared package in this monorepo.
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
                  // Touch fallback: tap one row then another to swap them, the same
                  // affordance the module item list uses. No dnd library anywhere.
                  onClick={() => {
                    if (!drag || drag.group !== group) { setDrag({ group, from: pos }); return; }
                    move(group, order, drag.from, pos);
                    setDrag(null);
                  }}
                >
                  <Handle>⠿</Handle>
                  <Num>{pos + 1}.</Num>
                  <span>{items[itemIndex]?.name ?? '?'}</span>
                  {!items[itemIndex]?.location && <span title={t.mapLocation}>📍❌</span>}
                </Row>
              ))}
            </List>
          </GroupBlock>
        );
      })}
    </div>
  );
}
