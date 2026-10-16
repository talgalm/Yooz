import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDarkColor, themedTitleInk } from './themeInk';

test('dark theme colours are dark, light ones and junk are not', () => {
  for (const dark of ['#111111', '#111', '#222222', '#2D1B4E', '#582b9c', '#211a14', '#6c5ce7']) assert.equal(isDarkColor(dark), true, dark);
  for (const light of ['#ffffff', '#fff', '#f5f0e1', '#ffd400', 'not a colour', '']) assert.equal(isDarkColor(light), false, light);
});

test('a dark title loses the black outline for a light halo, a light one keeps it', () => {
  assert.equal(themedTitleInk(undefined), undefined);
  const dark = themedTitleInk('#111111');
  assert.equal(dark?.color, '#111111');
  assert.equal(dark?.WebkitTextStroke, '0');
  assert.ok(String(dark?.textShadow).includes('255,255,255'));
  assert.deepEqual(themedTitleInk('#ffffff'), { color: '#ffffff' });
});
