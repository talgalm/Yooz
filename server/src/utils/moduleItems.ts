import type { IModuleConfig } from '../models';

/**
 * The item indices a participant actually sees, in the order they see them.
 *
 * Two things happen here and the order matters:
 *  1. `items[].groups` hides items from groups they aren't addressed to.
 *  2. `module.groupOrders[group]` (map modules) rearranges what's left.
 *
 * Returned values are indices into `module.items` — their *stored* positions.
 * The client only ever sees the resulting array's own 0..n-1 positions, which
 * is the index space every Report and MapGroupState uses, exactly as it already
 * was when the group filter alone shifted indices.
 *
 * `groupOrders` entries are admin-authored and go stale whenever items are added
 * or removed, so they are treated as a hint, not a spec: unknown or duplicated
 * entries are dropped and anything the permutation forgot keeps its stored place
 * at the end. A stale order degrades, it never hides a station.
 */
export function visibleOrderedIndices(
  module: Pick<IModuleConfig, 'items' | 'groupOrders'>,
  participantGroup?: string,
): number[] {
  const visible: number[] = [];
  (module.items || []).forEach((item, i) => {
    // No restriction, or the participant isn't in a group at all (single mode).
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

/** First position in the group's list that hasn't been completed; `total` when done. */
export function nextIncompleteIndex(completed: number[], total: number): number {
  const done = new Set(completed);
  for (let i = 0; i < total; i++) if (!done.has(i)) return i;
  return total;
}
