import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteUrlsDeep, rewriteUrlsInText } from './rewriteCloudinaryUrls';

const known = new Map([
  ['https://res.cloudinary.com/c/image/upload/v1/yooz/a.png', 'https://cdn/yooz/a.png'],
  ['https://res.cloudinary.com/c/video/upload/v2/yooz/b.mp4', 'https://cdn/yooz/b.mp4'],
]);
const mapUrl = (url: string) => known.get(url) ?? null;

test('urls inside rich text are swapped, trailing punctuation kept', () => {
  const html = '<img src="https://res.cloudinary.com/c/image/upload/v1/yooz/a.png"> see https://res.cloudinary.com/c/video/upload/v2/yooz/b.mp4.';
  const out = rewriteUrlsInText(html, mapUrl);
  assert.equal(out.value, '<img src="https://cdn/yooz/a.png"> see https://cdn/yooz/b.mp4.');
  assert.equal(out.replaced, 2);
});

test('unknown urls are left alone and reported', () => {
  const out = rewriteUrlsInText('https://res.cloudinary.com/c/image/upload/v1/yooz/gone.png', mapUrl);
  assert.equal(out.value, 'https://res.cloudinary.com/c/image/upload/v1/yooz/gone.png');
  assert.equal(out.replaced, 0);
  assert.deepEqual(out.unmapped, ['https://res.cloudinary.com/c/image/upload/v1/yooz/gone.png']);
});

test('nested documents are rewritten, other values untouched', () => {
  const id = { toHexString: () => 'x' };
  const when = new Date(0);
  const doc = { _id: id, when, n: 3, settings: { images: ['https://res.cloudinary.com/c/image/upload/v1/yooz/a.png', 'plain'] } };
  const out = rewriteUrlsDeep(doc, mapUrl);
  assert.equal(out.replaced, 1);
  assert.equal(out.value._id, id);
  assert.equal(out.value.when, when);
  assert.deepEqual(out.value.settings.images, ['https://cdn/yooz/a.png', 'plain']);
  assert.equal(doc.settings.images[0], 'https://res.cloudinary.com/c/image/upload/v1/yooz/a.png');
});

test('an untouched document keeps its identity', () => {
  const doc = { a: ['x'], b: { c: 'y' } };
  assert.equal(rewriteUrlsDeep(doc, mapUrl).value, doc);
});
