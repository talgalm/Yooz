import { test } from 'node:test';
import assert from 'node:assert';
import { docMentions } from './mediaInUse';

const PUBLIC_ID = 'yooz/abc123';
const url = (id: string) => `https://res.cloudinary.com/drhc5tpmg/image/upload/v1787818231/${id}.png`;

test('finds the asset in a free-form game.settings bag', () => {
  assert.ok(docMentions({ name: 'g', settings: { rounds: [{ imageUrl: url(PUBLIC_ID) }] } }, PUBLIC_ID));
});

test('finds it through a Cloudinary transformation', () => {
  const transformed = `https://res.cloudinary.com/drhc5tpmg/image/upload/w_300,c_fill,q_auto/v1/${PUBLIC_ID}.png`;
  assert.ok(docMentions({ module: { popups: [{ media: transformed }] } }, PUBLIC_ID));
});

test('an unrelated asset is not a match', () => {
  assert.strictEqual(docMentions({ settings: { imageUrl: url('yooz/zzz999') } }, PUBLIC_ID), false);
});

test('empty doc / empty needle never claim a match', () => {
  assert.strictEqual(docMentions(null, PUBLIC_ID), false);
  assert.strictEqual(docMentions({ settings: { imageUrl: url(PUBLIC_ID) } }, ''), false);
});
