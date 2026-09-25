import type { IModuleConfig, IItemLocation } from '../models';

export function sanitizeLocation(raw: unknown): IItemLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { lat, lng, address } = raw as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  const label = typeof address === 'string' ? address.trim().slice(0, 300) : '';
  return { lat, lng, ...(label && { address: label }) };
}

export function sanitizeProximityMeters(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.min(200, Math.max(5, Math.round(raw)));
}

export function sanitizeGroupOrders(raw: unknown, itemCount: number): Record<string, number[]> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const orders: Record<string, number[]> = {};
  for (const [group, order] of Object.entries(raw)) {
    if (!group.trim() || group.startsWith('$') || !Array.isArray(order)) continue;
    const clean: number[] = [];
    for (const i of order) {
      if (Number.isInteger(i) && i >= 0 && i < itemCount && !clean.includes(i)) clean.push(i);
    }
    if (clean.length > 0) orders[group] = clean;
  }
  return Object.keys(orders).length > 0 ? orders : undefined;
}

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
