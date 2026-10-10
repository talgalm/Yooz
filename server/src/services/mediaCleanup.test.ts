import { test } from 'node:test';
import assert from 'node:assert';
import { pickExpired, type CloudAsset } from './mediaCleanup';

const now = Date.parse('2026-10-10T00:00:00Z');
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();
const asset = (publicId: string, days: number): CloudAsset => ({ publicId, resourceType: 'image', bytes: 1, createdAt: daysAgo(days) });
const ids = (assets: CloudAsset[]) => assets.map((a) => a.publicId);

test('collage inputs go after 2 days, finished collages after 30', () => {
  const picked = pickExpired(
    [asset('yooz/collage-inputs/ABC/1', 3), asset('yooz/collage-inputs/ABC/2', 1), asset('yooz/collages/old', 31), asset('yooz/collages/new', 29)],
    now,
  );
  assert.deepStrictEqual(ids(picked.collageInputs), ['yooz/collage-inputs/ABC/1']);
  assert.deepStrictEqual(ids(picked.collages), ['yooz/collages/old']);
  assert.deepStrictEqual(ids(picked.uploadCandidates), []);
});

test('only old admin uploads are candidates for the unused check', () => {
  const picked = pickExpired(
    [asset('yooz/logo', 40), asset('yooz/folder/pic', 40), asset('yooz/fresh', 5), asset('yooz/tutorials/t', 400), asset('yooz/face-swap/x', 400), asset('samples/cat', 400)],
    now,
  );
  assert.deepStrictEqual(ids(picked.uploadCandidates), ['yooz/logo', 'yooz/folder/pic']);
});
