import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockOrder,
  collageVideoPartTooEarly,
  popupAudienceRoute,
  popupStationIndex,
  popupSavedIndex,
  draftsToRoutes,
  locationBlocks,
  routeIndices,
  routesFromGroupOrders,
  routesToDrafts,
  withItemUids,
  withRouteRemoved,
} from './groupRoutes';

const keyed = (...uids: string[]) => uids.map((uid) => ({ uid }));

test('every station gets its own id, and copies of a station get new ones', () => {
  const items = withItemUids([{ uid: 'a' }, {}, { uid: 'a' }]);
  assert.equal(items[0].uid, 'a');
  assert.ok(items[1].uid && items[1].uid !== 'a');
  assert.ok(items[2].uid && items[2].uid !== 'a' && items[2].uid !== items[1].uid);
  const settled = [{ uid: 'x' }, { uid: 'y' }];
  assert.equal(withItemUids(settled), settled);
});

test('a route follows its stations when the list changes around them', () => {
  const route = { name: 'A', uids: ['c', 'a', 'b'] };
  assert.deepEqual(routeIndices(route, keyed('a', 'b', 'c')), [2, 0, 1]);
  assert.deepEqual(routeIndices(route, keyed('b', 'c')), [1, 0]);
  assert.deepEqual(routeIndices(route, keyed('a', 'b', 'c', 'd')), [2, 0, 1, 3]);
});

test('saved routes round-trip through the editor', () => {
  const items = keyed('a', 'b', 'c');
  const drafts = routesToDrafts([{ name: 'North', order: [2, 0, 1] }], items);
  assert.deepEqual(drafts, [{ name: 'North', uids: ['c', 'a', 'b'] }]);
  assert.deepEqual(draftsToRoutes(drafts, items), [{ name: 'North', order: [2, 0, 1] }]);
});

test('per-group orders from before become routes, one per distinct order', () => {
  const items = keyed('a', 'b', 'c');
  const { routes, groupRoutes } = routesFromGroupOrders({ Red: [2, 1, 0], Blue: [0, 1, 2], Green: [2, 1, 0] }, items);
  assert.deepEqual(routes.map((r) => r.uids), [['c', 'b', 'a'], ['a', 'b', 'c']]);
  assert.deepEqual(groupRoutes, { Red: 0, Blue: 1, Green: 0 });
});

test('photo parts may come in any order, only the video part before a photo part is flagged', () => {
  const part = (partIndex: number) => ({ collageSplit: { splitGroupId: 's', partIndex, partSizes: [3, 3, 0], videoPartIndex: 2 } });
  const items = [{}, part(0), part(1), part(2)];
  assert.equal(collageVideoPartTooEarly([0, 1, 2, 3], items), false);
  assert.equal(collageVideoPartTooEarly([2, 0, 1, 3], items), false);
  assert.equal(collageVideoPartTooEarly([1, 3, 0, 2], items), true);
  const noVideo = (partIndex: number) => ({ collageSplit: { splitGroupId: 't', partIndex, partSizes: [2, 2] } });
  assert.equal(collageVideoPartTooEarly([1, 0], [noVideo(0), noVideo(1)]), false);
});

test('removing a route drops its groups and shifts the later routes down', () => {
  assert.deepEqual(withRouteRemoved({ Red: 0, Blue: 1, Green: 2 }, 1), { Red: 0, Green: 1 });
});

const spot = { lat: 32, lng: 34.8 };

test('a station with no location joins the located station before it', () => {
  assert.deepEqual(locationBlocks([{ location: spot }, {}, {}, { location: spot }, {}]), [[0, 1, 2], [3, 4]]);
  assert.deepEqual(locationBlocks([{}, { location: spot }, {}]), [[0, 1, 2]]);
  assert.deepEqual(locationBlocks([{}, {}]), [[0], [1]]);
});

test('a route moves a station together with the ones attached to it', () => {
  const blocks = [[0, 1], [2], [3, 4]];
  assert.deepEqual(blockOrder([3, 0, 2], blocks), [[3, 4], [0, 1], [2]]);
  assert.deepEqual(blockOrder([1, 4, 2, 0, 3], blocks), [[0, 1], [3, 4], [2]]);
});

test('saving keeps every group of stations together', () => {
  const items = [
    { uid: 'a', location: spot }, { uid: 'b' }, { uid: 'c', location: spot }, { uid: 'd' },
  ];
  assert.deepEqual(draftsToRoutes([{ name: 'R', uids: ['c', 'b', 'a', 'd'] }], items), [{ name: 'R', order: [2, 3, 0, 1] }]);
});

test('a popup for one route, or for groups on one route, is numbered by that route', () => {
  const groupRoutes = { Red: 0, Blue: 1, Green: 1 };
  assert.deepEqual(popupAudienceRoute({ groups: [], routes: [] }, groupRoutes, 2), { route: null, mixed: false });
  assert.deepEqual(popupAudienceRoute({ groups: [], routes: [1] }, groupRoutes, 2), { route: 1, mixed: false });
  assert.deepEqual(popupAudienceRoute({ groups: ['Blue', 'Green'], routes: [1] }, groupRoutes, 2), { route: 1, mixed: false });
  assert.deepEqual(popupAudienceRoute({ groups: ['Red', 'Blue'], routes: [] }, groupRoutes, 2), { route: null, mixed: true });
  assert.deepEqual(popupAudienceRoute({ groups: ['Yellow'], routes: [] }, groupRoutes, 2), { route: null, mixed: false });
  assert.deepEqual(popupAudienceRoute({ groups: ['Yellow'], routes: [0] }, groupRoutes, 2), { route: null, mixed: true });
});

test('a popup follows its station when the list is reordered', () => {
  const items = [{ uid: 'b' }, { uid: 'c' }, { uid: 'a' }];
  assert.equal(popupStationIndex({ itemIndex: 0, itemUid: 'a' }, items), 2);
  assert.equal(popupStationIndex({ itemIndex: 1 }, items), 1);
  assert.equal(popupStationIndex({ itemIndex: 7, itemUid: 'gone' }, items), 2);
  assert.equal(popupStationIndex({ itemIndex: 3, itemUid: 'a' }, []), 0);
});

test('a step popup saves its step, not the station that sits there now', () => {
  const items = [{ uid: 'b' }, { uid: 'c' }, { uid: 'a' }];
  assert.equal(popupSavedIndex({ itemIndex: 1, itemUid: 'a', byStep: true }, items), 1);
  assert.equal(popupSavedIndex({ itemIndex: 9, byStep: true }, items), 2);
  assert.equal(popupSavedIndex({ itemIndex: 1, itemUid: 'a' }, items), 2);
  assert.equal(popupSavedIndex({ itemIndex: 4, byStep: true }, []), 0);
});
