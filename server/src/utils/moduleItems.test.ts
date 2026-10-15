import test from 'node:test';
import assert from 'node:assert/strict';
import {
  visibleOrderedIndices,
  sanitizeLocation,
  sanitizeProximityMeters,
  sanitizeGroupOrders,
  popupsForServedItems,
  sanitizeRoutes,
  sanitizeGroupRoutes,
  keepCollageVideoPartLast,
  collageVisitRoles,
  sanitizeCollageSplit,
  ordersFromRoutes,
  popupVisibleTo,
} from './moduleItems';

const items = (...groups: (string[] | undefined)[]) =>
  ({ items: groups.map((g) => ({ groups: g })) }) as never;

test('no groups configured: everything, in stored order', () => {
  assert.deepEqual(visibleOrderedIndices(items(undefined, undefined, undefined)), [0, 1, 2]);
});

test('group-restricted items are hidden from other groups', () => {
  const m = items(undefined, ['red'], ['blue']);
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 2]);
  assert.deepEqual(visibleOrderedIndices(m), [0, 1, 2]);
});

test('groupOrders rearranges, per group', () => {
  const m = { ...(items(undefined, undefined, undefined) as object), groupOrders: { red: [2, 0, 1] } } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [2, 0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 1, 2]);
});

test('a stale order degrades instead of losing stations', () => {
  const m = {
    ...(items(undefined, undefined, undefined) as object),
    groupOrders: { red: [7, 1, 1] },
  } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [1, 0, 2]);
});

test('an order cannot smuggle in an item the group filter hid', () => {
  const m = { ...(items(undefined, ['blue']) as object), groupOrders: { red: [1, 0] } } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [0]);
});

test('a station location keeps real coordinates and a trimmed address', () => {
  assert.deepEqual(sanitizeLocation({ lat: 32.1, lng: 34.8, address: '  Yarkon Park ' }), { lat: 32.1, lng: 34.8, address: 'Yarkon Park' });
  assert.deepEqual(sanitizeLocation({ lat: 0, lng: 0, address: '   ' }), { lat: 0, lng: 0 });
  assert.deepEqual(sanitizeLocation({ lat: 32.1, lng: 34.8, placeName: '  Hayekim Museum ' }), { lat: 32.1, lng: 34.8, placeName: 'Hayekim Museum' });
});

test('a station location without usable coordinates is dropped, not guessed', () => {
  assert.equal(sanitizeLocation(undefined), undefined);
  assert.equal(sanitizeLocation({ lat: '32.1', lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: Number.NaN, lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: 91, lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: 32.1 }), undefined);
});

test('the opening radius is clamped to what the admin form allows', () => {
  assert.equal(sanitizeProximityMeters(10), 10);
  assert.equal(sanitizeProximityMeters(1), 5);
  assert.equal(sanitizeProximityMeters(999), 200);
  assert.equal(sanitizeProximityMeters(12.4), 12);
  assert.equal(sanitizeProximityMeters('10'), undefined);
  assert.equal(sanitizeProximityMeters(Number.POSITIVE_INFINITY), undefined);
});

test('team orders keep only real, distinct station indices', () => {
  assert.deepEqual(sanitizeGroupOrders({ red: [2, 0, 1] }, 3), { red: [2, 0, 1] });
  assert.deepEqual(sanitizeGroupOrders({ red: [2, 2, 7, -1, 1.5, 0] }, 3), { red: [2, 0] });
  assert.deepEqual(sanitizeGroupOrders({ red: [], blue: 'x', '': [0], $where: [0], green: [1] }, 3), { green: [1] });
  assert.equal(sanitizeGroupOrders({ red: [] }, 3), undefined);
  assert.equal(sanitizeGroupOrders([[0]], 3), undefined);
  assert.equal(sanitizeGroupOrders(null, 3), undefined);
});

test('station popups follow the station into the order the player is served', () => {
  const popup = (point: string, itemIndex?: number) => ({ title: `${point}:${itemIndex}`, trigger: { point, itemIndex } });
  const served = [2, 0];
  const out = popupsForServedItems(
    [popup('afterItem', 2), popup('beforeItem', 0), popup('afterItem', 1), popup('afterLogin', 1), popup('endOfActivity'), popup('beforeItem')],
    served,
  );
  assert.deepEqual(out.map((p) => [p.title, p.trigger.itemIndex]), [
    ['afterItem:2', 0],
    ['beforeItem:0', 1],
    ['afterLogin:1', 1],
    ['endOfActivity:undefined', undefined],
    ['beforeItem:undefined', undefined],
  ]);
});

test('a route keeps every station once, in range, and names itself if left blank', () => {
  assert.deepEqual(sanitizeRoutes([{ name: ' North ', order: [2, 2, 9, 0] }, { order: [1] }], 3), [
    { name: 'North', order: [2, 0, 1] },
    { name: '2', order: [1, 0, 2] },
  ]);
  assert.equal(sanitizeRoutes([], 3), undefined);
  assert.equal(sanitizeRoutes('x', 3), undefined);
});

test('only known groups get a route, and only a route that exists', () => {
  assert.deepEqual(sanitizeGroupRoutes({ Red: 0, Blue: 1, Ghost: 0, Green: 5 }, 2, ['Red', 'Blue', 'Green']), { Red: 0, Blue: 1 });
  assert.equal(sanitizeGroupRoutes({ Red: 0 }, 0, ['Red']), undefined);
});

test('photo parts go in any order, a dedicated video part comes after them', () => {
  const split = (partIndex: number) => ({ collageSplit: { splitGroupId: 's', partIndex, partSizes: [3, 3, 0], videoPartIndex: 2 } });
  const its = [{}, split(0), {}, split(1), split(2)] as never[];
  assert.deepEqual(keepCollageVideoPartLast([3, 0, 1, 2, 4], its), [3, 0, 1, 2, 4]);
  assert.deepEqual(keepCollageVideoPartLast([4, 3, 0, 1, 2], its), [3, 0, 1, 4, 2]);
  const noVideo = (partIndex: number) => ({ collageSplit: { splitGroupId: 't', partIndex, partSizes: [2, 2] } });
  assert.deepEqual(keepCollageVideoPartLast([1, 0], [noVideo(0), noVideo(1)] as never[]), [1, 0]);
});

test('the first part a route visits opens the collage, the last one it visits makes the video', () => {
  const part = (partIndex: number, videoPartIndex?: number) => ({ collageSplit: { splitGroupId: 'g', partIndex, partSizes: [1, 1, 1], ...(videoPartIndex !== undefined && { videoPartIndex }) } });
  assert.deepEqual(collageVisitRoles([part(2), {}, part(0), part(1)] as never[]), [
    { servedFirst: true, servedFinale: false },
    undefined,
    { servedFirst: false, servedFinale: false },
    { servedFirst: false, servedFinale: true },
  ]);
  const withVideo = (partIndex: number) => part(partIndex, 2);
  assert.deepEqual(collageVisitRoles([withVideo(1), withVideo(0), withVideo(2)] as never[]).map((r) => r?.servedFinale), [false, false, true]);
});

test('a collage split keeps a part name and a video order only when they make sense', () => {
  const clean = sanitizeCollageSplit({ splitGroupId: 'g', partIndex: 1, partSizes: [2, 3], photoOrder: [4, 3, 2, 1, 0], videoOrder: [1, 0, 2, 3, 4], partName: '  Lookout  ', partDescription: '  Photograph the view  ', junk: 1 });
  assert.deepEqual(clean, { splitGroupId: 'g', partIndex: 1, partSizes: [2, 3], photoOrder: [4, 3, 2, 1, 0], videoOrder: [1, 0, 2, 3, 4], partName: 'Lookout', partDescription: 'Photograph the view' });
  assert.equal(sanitizeCollageSplit({ splitGroupId: 'g', partIndex: 0, partSizes: [2], videoOrder: [0, 0] })?.videoOrder, undefined);
  assert.equal(sanitizeCollageSplit({ partIndex: 0 }), undefined);
});

test('each assigned group walks its route, the rest keep the stored order', () => {
  const routes = [{ name: 'A', order: [0, 1, 2] }, { name: 'B', order: [2, 1, 0] }];
  assert.deepEqual(ordersFromRoutes(routes, { Red: 1, Blue: 0 }, [{}, {}, {}]), { Red: [2, 1, 0], Blue: [0, 1, 2] });
  assert.equal(ordersFromRoutes(routes, {}, [{}, {}, {}]), undefined);
});

test('a popup for some groups shows to those groups only', () => {
  assert.equal(popupVisibleTo({}, 'Red'), true);
  assert.equal(popupVisibleTo({ groups: ['Red'] }, 'Red'), true);
  assert.equal(popupVisibleTo({ groups: ['Red'] }, 'Blue'), false);
  assert.equal(popupVisibleTo({ groups: ['Red'] }, undefined), false);
});

test('a popup for a route shows to every group on that route', () => {
  const groupRoutes = { Red: 0, Blue: 1, Green: 1 };
  assert.equal(popupVisibleTo({ routes: [1] }, 'Blue', groupRoutes), true);
  assert.equal(popupVisibleTo({ routes: [1] }, 'Green', groupRoutes), true);
  assert.equal(popupVisibleTo({ routes: [1] }, 'Red', groupRoutes), false);
  assert.equal(popupVisibleTo({ routes: [1] }, 'Yellow', groupRoutes), false);
  assert.equal(popupVisibleTo({ routes: [1], groups: ['Red'] }, 'Red', groupRoutes), true);
});
