import type { IModuleConfig, IModuleItem, IItemLocation, IGroupRoute } from '../models';

export const ROUTES_MAX = 12;
const ROUTE_NAME_MAX = 60;
const PLACE_NAME_MAX = 80;

export function sanitizeLocation(raw: unknown): IItemLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { lat, lng, address, placeName } = raw as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  const label = typeof address === 'string' ? address.trim().slice(0, 300) : '';
  const place = typeof placeName === 'string' ? placeName.trim().slice(0, PLACE_NAME_MAX) : '';
  return { lat, lng, ...(label && { address: label }), ...(place && { placeName: place }) };
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

export function sanitizeRoutes(raw: unknown, itemCount: number): IGroupRoute[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const routes = raw.slice(0, ROUTES_MAX).flatMap((entry, r) => {
    if (!entry || typeof entry !== 'object') return [];
    const { name, order } = entry as Record<string, unknown>;
    const clean: number[] = [];
    for (const i of Array.isArray(order) ? order : []) {
      if (Number.isInteger(i) && i >= 0 && i < itemCount && !clean.includes(i)) clean.push(i);
    }
    for (let i = 0; i < itemCount; i++) if (!clean.includes(i)) clean.push(i);
    const label = typeof name === 'string' ? name.trim().slice(0, ROUTE_NAME_MAX) : '';
    return [{ name: label || `${r + 1}`, order: clean }];
  });
  return routes.length > 0 ? routes : undefined;
}

export function sanitizeGroupRoutes(raw: unknown, routeCount: number, groupNames: string[]): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || routeCount === 0) return undefined;
  const known = new Set(groupNames.map((g) => g.trim()).filter(Boolean));
  const assigned: Record<string, number> = {};
  for (const [group, route] of Object.entries(raw)) {
    if (!known.has(group) || !Number.isInteger(route) || (route as number) < 0 || (route as number) >= routeCount) continue;
    assigned[group] = route as number;
  }
  return Object.keys(assigned).length > 0 ? assigned : undefined;
}

const PART_NAME_MAX = 80;

type CollageSplitMeta = NonNullable<IModuleItem['collageSplit']>;

function hasVideoPart(split: CollageSplitMeta): boolean {
  return typeof split.videoPartIndex === 'number' && split.videoPartIndex >= 0;
}

function isVideoPart(split: CollageSplitMeta): boolean {
  return hasVideoPart(split) && split.partIndex === split.videoPartIndex;
}

export function keepCollageVideoPartLast(order: number[], items: Pick<IModuleItem, 'collageSplit'>[]): number[] {
  const next = [...order];
  const groups = new Set(next.map((i) => items[i]?.collageSplit?.splitGroupId).filter((g): g is string => !!g));
  for (const group of groups) {
    const at = next.findIndex((i) => items[i]?.collageSplit?.splitGroupId === group && isVideoPart(items[i].collageSplit!));
    if (at === -1) continue;
    let lastOther = -1;
    next.forEach((i, position) => {
      const split = items[i]?.collageSplit;
      if (split?.splitGroupId === group && !isVideoPart(split)) lastOther = position;
    });
    if (lastOther > at) next.splice(lastOther, 0, ...next.splice(at, 1));
  }
  return next;
}

export interface CollageVisitRole {
  servedFirst: boolean;
  servedFinale: boolean;
}

export function collageVisitRoles(served: Pick<IModuleItem, 'collageSplit'>[]): (CollageVisitRole | undefined)[] {
  const firstAt = new Map<string, number>();
  const lastAt = new Map<string, number>();
  served.forEach((item, position) => {
    const group = item.collageSplit?.splitGroupId;
    if (!group) return;
    if (!firstAt.has(group)) firstAt.set(group, position);
    lastAt.set(group, position);
  });
  return served.map((item, position) => {
    const split = item.collageSplit;
    if (!split) return undefined;
    return {
      servedFirst: firstAt.get(split.splitGroupId) === position,
      servedFinale: hasVideoPart(split) ? isVideoPart(split) : lastAt.get(split.splitGroupId) === position,
    };
  });
}

export function sanitizeCollageSplit(raw: unknown): IModuleItem['collageSplit'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.splitGroupId !== 'string' || !s.splitGroupId || !Number.isInteger(s.partIndex)) return undefined;
  const ints = (v: unknown) => (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0) ? (v as number[]) : undefined);
  const partSizes = ints(s.partSizes) ?? [];
  const photoCount = partSizes.reduce((sum, n) => sum + n, 0);
  const isPermutation = (v: number[] | undefined) => !!v && v.length === photoCount && new Set(v).size === v.length && v.every((n) => n < photoCount);
  const photoOrder = ints(s.photoOrder);
  const videoOrder = ints(s.videoOrder);
  const partName = typeof s.partName === 'string' ? s.partName.trim().slice(0, PART_NAME_MAX) : '';
  return {
    splitGroupId: s.splitGroupId,
    partIndex: s.partIndex as number,
    partSizes,
    ...(Number.isInteger(s.totalParts) && { totalParts: s.totalParts as number }),
    ...(Number.isInteger(s.videoPartIndex) && { videoPartIndex: s.videoPartIndex as number }),
    ...(isPermutation(photoOrder) && { photoOrder }),
    ...(isPermutation(videoOrder) && { videoOrder }),
    ...(partName && { partName }),
  };
}

export function ordersFromRoutes(
  routes: IGroupRoute[],
  groupRoutes: Record<string, number>,
  items: Pick<IModuleItem, 'collageSplit'>[],
): Record<string, number[]> | undefined {
  const orders: Record<string, number[]> = {};
  for (const [group, route] of Object.entries(groupRoutes)) {
    const order = routes[route]?.order;
    if (order?.length) orders[group] = keepCollageVideoPartLast(order, items);
  }
  return Object.keys(orders).length > 0 ? orders : undefined;
}

export function popupVisibleTo(
  popup: { groups?: string[]; routes?: number[] },
  participantGroup?: string,
  groupRoutes?: Record<string, number>,
): boolean {
  if (!popup.groups?.length && !popup.routes?.length) return true;
  if (!participantGroup) return false;
  if (popup.groups?.includes(participantGroup)) return true;
  const route = groupRoutes?.[participantGroup];
  return route !== undefined && !!popup.routes?.includes(route);
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

const ITEM_TRIGGER_POINTS = new Set(['beforeItem', 'afterItem']);

export function popupsForServedItems<P extends { trigger: { point: string; itemIndex?: number | null } }>(
  popups: P[],
  served: number[],
): P[] {
  return popups.flatMap((p) => {
    const stored = p.trigger.itemIndex;
    if (!ITEM_TRIGGER_POINTS.has(p.trigger.point) || stored === undefined || stored === null) return [p];
    const position = served.indexOf(stored);
    return position === -1 ? [] : [{ ...p, trigger: { ...p.trigger, itemIndex: position } }];
  });
}
