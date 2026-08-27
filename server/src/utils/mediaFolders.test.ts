import { test } from 'node:test';
import assert from 'node:assert';
import { resolveFolder, isDeletableAsset } from './mediaFolders';

// Run: npx tsx --test server/src/utils/mediaFolders.test.ts

test('empty input means the root folder', () => {
  assert.strictEqual(resolveFolder(undefined), 'yooz');
  assert.strictEqual(resolveFolder(''), 'yooz');
  assert.strictEqual(resolveFolder('yooz'), 'yooz');
});

test('a bare name is taken as root-relative', () => {
  assert.strictEqual(resolveFolder('logos'), 'yooz/logos');
  assert.strictEqual(resolveFolder('yooz/logos'), 'yooz/logos');
  assert.strictEqual(resolveFolder('/logos/'), 'yooz/logos');
  assert.strictEqual(resolveFolder('לוגו'), 'yooz/לוגו');
});

test('nesting is allowed, three levels deep', () => {
  assert.strictEqual(resolveFolder('a/b/c'), 'yooz/a/b/c');
  assert.strictEqual(resolveFolder('a/b/c/d'), null);
});

test('traversal and paths outside yooz are refused', () => {
  assert.strictEqual(resolveFolder('../secrets'), null);
  assert.strictEqual(resolveFolder('yooz/../samples'), null);
  assert.strictEqual(resolveFolder('yooz//x'), null);
  assert.strictEqual(resolveFolder(42), null);
});

test('machine folders are not addressable', () => {
  for (const folder of ['collages', 'collage-inputs', 'tutorials', 'face-swap']) {
    assert.strictEqual(resolveFolder(folder), null, folder);
    assert.strictEqual(resolveFolder(`yooz/${folder}/deeper`), null, folder);
  }
});

test('only admin uploads may be moved or destroyed', () => {
  assert.ok(isDeletableAsset('yooz/abc123'));
  assert.ok(isDeletableAsset('yooz/logos/abc123'), 'an upload inside an admin folder');
  assert.strictEqual(isDeletableAsset('yooz/collages/abc'), false);
  assert.strictEqual(isDeletableAsset('yooz/collage-inputs/abc'), false);
  assert.strictEqual(isDeletableAsset('yooz/tutorials/abc'), false);
  assert.strictEqual(isDeletableAsset('samples/cat'), false);
  assert.strictEqual(isDeletableAsset('yooz'), false);
  assert.strictEqual(isDeletableAsset('yooz/../samples/cat'), false);
});
