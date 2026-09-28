import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeMapDesign, MAP_STYLE_IDS, MAP_FEATURE_KEYS } from './mapDesign';

test('a chosen style and hidden features are kept', () => {
  assert.deepEqual(
    sanitizeMapDesign({ style: 'vintage', hidden: ['business', 'bus'] }),
    { style: 'vintage', hidden: ['business', 'bus'] },
  );
});

test('the untouched default is not stored, so old activities and new ones look the same', () => {
  assert.equal(sanitizeMapDesign({ style: 'standard', hidden: [] }), undefined);
  assert.equal(sanitizeMapDesign(undefined), undefined);
  assert.equal(sanitizeMapDesign(null), undefined);
  assert.equal(sanitizeMapDesign([]), undefined);
});

test('an unknown style falls back to standard without losing the hidden features', () => {
  assert.deepEqual(sanitizeMapDesign({ style: 'neon', hidden: ['park'] }), { style: 'standard', hidden: ['park'] });
});

test('unknown, repeated and non-string features are dropped, in a stable order', () => {
  assert.deepEqual(
    sanitizeMapDesign({ style: 'dark', hidden: ['railAndAir', 'restaurants', 'business', 'railAndAir', 7, { $gt: '' }] }),
    { style: 'dark', hidden: ['business', 'railAndAir'] },
  );
  assert.deepEqual(sanitizeMapDesign({ style: 'dark', hidden: 'business' }), { style: 'dark', hidden: [] });
});

test('the client offers exactly the styles and features the server keeps', () => {
  const file = path.resolve(__dirname, '../../../client/src/utils/mapDesign.ts');
  assert.ok(fs.existsSync(file), `client map design not found at ${file} - has it moved?`);
  const source = fs.readFileSync(file, 'utf8');
  const listed = (name: string) => {
    const body = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(source);
    assert.ok(body, `could not read ${name} out of the client file`);
    return [...body[1].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
  };
  assert.deepEqual(listed('MAP_STYLE_IDS'), [...MAP_STYLE_IDS], 'map styles differ between client and server - add it to both');
  assert.deepEqual(listed('MAP_FEATURE_KEYS'), [...MAP_FEATURE_KEYS], 'map features differ between client and server - add it to both');
});
