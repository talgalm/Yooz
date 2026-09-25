import type { IModuleConfig } from '../models';

export function visibleOrderedIndices(
  module: Pick<IModuleConfig, 'items' | 'groupOrders'>,
  participantGroup?: string,
): number[] {
  const visible: number[] = [];
  (module.items || []).forEach((item, i) => {
    if (!item.groups || item.groups.length === 0 || !participantGroup) visible.push(i);
    else if (item.groups.includes(participantGroup)) visible.push(i);
  });

  const order = participantGroup ? module.groupOrders?.[participantGroup] : undefined;
  if (!order || order.length === 0) return visible;

  const isVisible = new Set(visible);
  const taken = new Set<number>();
  const ordered: number[] = [];
  for (const i of order) {
    if (isVisible.has(i) && !taken.has(i)) {
      ordered.push(i);
      taken.add(i);
    }
  }
  for (const i of visible) if (!taken.has(i)) ordered.push(i);
  return ordered;
}

export function nextIncompleteIndex(completed: number[], total: number): number {
  const done = new Set(completed);
  for (let i = 0; i < total; i++) if (!done.has(i)) return i;
  return total;
}
