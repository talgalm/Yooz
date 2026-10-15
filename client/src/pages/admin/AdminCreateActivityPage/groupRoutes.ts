import type { CollageSplit } from './types';

export interface RouteDraft {
  name: string;
  uids: string[];
}

export interface StoredRoute {
  name: string;
  order: number[];
}

interface Keyed {
  uid?: string;
}

let uidCounter = 0;

export function newItemUid(): string {
  uidCounter += 1;
  return `it_${Date.now().toString(36)}_${uidCounter}`;
}

export function withItemUids<T extends Keyed>(items: T[]): T[] {
  const seen = new Set<string>();
  let changed = false;
  const next = items.map((item) => {
    if (item.uid && !seen.has(item.uid)) {
      seen.add(item.uid);
      return item;
    }
    changed = true;
    const uid = newItemUid();
    seen.add(uid);
    return { ...item, uid };
  });
  return changed ? next : items;
}

export function routeIndices(route: RouteDraft, items: Keyed[]): number[] {
  const position = new Map(items.map((item, i) => [item.uid, i]));
  const ordered: number[] = [];
  for (const uid of route.uids) {
    const i = position.get(uid);
    if (i !== undefined && !ordered.includes(i)) ordered.push(i);
  }
  items.forEach((_, i) => { if (!ordered.includes(i)) ordered.push(i); });
  return ordered;
}

export function locationBlocks(items: { location?: unknown }[]): number[][] {
  if (!items.some((item) => item.location)) return items.map((_, i) => [i]);
  const blocks: number[][] = [];
  const leading: number[] = [];
  items.forEach((item, i) => {
    if (item.location) blocks.push(blocks.length === 0 ? [...leading, i] : [i]);
    else if (blocks.length === 0) leading.push(i);
    else blocks[blocks.length - 1].push(i);
  });
  return blocks;
}

export function blockOrder(order: number[], blocks: number[][]): number[][] {
  const blockOf = new Map<number, number>();
  blocks.forEach((block, k) => block.forEach((i) => blockOf.set(i, k)));
  const seen: number[] = [];
  for (const i of order) {
    const k = blockOf.get(i);
    if (k !== undefined && !seen.includes(k)) seen.push(k);
  }
  blocks.forEach((_, k) => { if (!seen.includes(k)) seen.push(k); });
  return seen.map((k) => blocks[k]);
}

export function routesToDrafts(routes: StoredRoute[], items: Keyed[]): RouteDraft[] {
  return routes.map((route) => ({
    name: route.name,
    uids: route.order.flatMap((i) => (items[i]?.uid ? [items[i].uid as string] : [])),
  }));
}

export function draftsToRoutes(drafts: RouteDraft[], items: (Keyed & { location?: unknown })[]): StoredRoute[] {
  const blocks = locationBlocks(items);
  return drafts.map((draft) => ({ name: draft.name.trim(), order: blockOrder(routeIndices(draft, items), blocks).flat() }));
}

export function popupStationIndex(popup: { itemIndex: number; itemUid?: string }, items: Keyed[]): number {
  if (items.length === 0) return 0;
  const followed = popup.itemUid ? items.findIndex((item) => item.uid === popup.itemUid) : -1;
  return followed !== -1 ? followed : Math.min(Math.max(0, popup.itemIndex), items.length - 1);
}

export function popupSavedIndex(popup: { itemIndex: number; itemUid?: string; byStep?: boolean }, items: Keyed[]): number {
  if (!popup.byStep) return popupStationIndex(popup, items);
  return items.length === 0 ? 0 : Math.min(Math.max(0, popup.itemIndex), items.length - 1);
}

export function popupAudienceRoute(
  popup: { groups: string[]; routes: number[] },
  groupRoutes: Record<string, number>,
  routeCount: number,
): { route: number | null; mixed: boolean } {
  const walked = new Set<number>([
    ...popup.routes.filter((r) => r >= 0 && r < routeCount),
    ...popup.groups.map((g) => {
      const route = groupRoutes[g];
      return route !== undefined && route < routeCount ? route : -1;
    }),
  ]);
  if (walked.size > 1) return { route: null, mixed: true };
  const only = [...walked][0];
  return { route: only !== undefined && only >= 0 ? only : null, mixed: false };
}

export function routesFromGroupOrders(
  groupOrders: Record<string, number[]>,
  items: Keyed[],
): { routes: RouteDraft[]; groupRoutes: Record<string, number> } {
  const routes: RouteDraft[] = [];
  const signatures: string[] = [];
  const groupRoutes: Record<string, number> = {};
  for (const [group, order] of Object.entries(groupOrders)) {
    const full = routeIndices({ name: '', uids: order.flatMap((i) => (items[i]?.uid ? [items[i].uid as string] : [])) }, items);
    const signature = full.join(',');
    let route = signatures.indexOf(signature);
    if (route === -1) {
      route = routes.length;
      signatures.push(signature);
      routes.push({ name: group, uids: full.map((i) => items[i].uid as string) });
    }
    groupRoutes[group] = route;
  }
  return { routes, groupRoutes };
}

function isVideoPart(split: CollageSplit): boolean {
  return typeof split.videoPartIndex === 'number' && split.videoPartIndex >= 0 && split.partIndex === split.videoPartIndex;
}

export function collageVideoPartTooEarly(order: number[], items: { collageSplit?: CollageSplit }[]): boolean {
  const videoSeen = new Set<string>();
  for (const i of order) {
    const split = items[i]?.collageSplit;
    if (!split) continue;
    if (isVideoPart(split)) videoSeen.add(split.splitGroupId);
    else if (videoSeen.has(split.splitGroupId)) return true;
  }
  return false;
}

export function withRouteRemoved(groupRoutes: Record<string, number>, removed: number): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [group, route] of Object.entries(groupRoutes)) {
    if (route === removed) continue;
    next[group] = route > removed ? route - 1 : route;
  }
  return next;
}
