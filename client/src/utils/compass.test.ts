import test from 'node:test';
import assert from 'node:assert/strict';
import { compassHeading } from './compass';

test('an iPhone reports its compass heading directly', () => {
  assert.equal(compassHeading({ alpha: 12, absolute: false, webkitCompassHeading: 90 }), 90);
});

test('Android reports alpha counter-clockwise from north, so east is alpha 270', () => {
  assert.equal(compassHeading({ alpha: 270, absolute: true }), 90);
  assert.equal(compassHeading({ alpha: 0, absolute: true }), 0);
});

test('a relative reading has no north, so it gives no heading', () => {
  assert.equal(compassHeading({ alpha: 270, absolute: false }), null);
  assert.equal(compassHeading({ alpha: null, absolute: true }), null);
});

test('a phone turned to landscape adds the screen angle', () => {
  assert.equal(compassHeading({ alpha: 0, absolute: true }, 90), 90);
  assert.equal(compassHeading({ alpha: 0, absolute: false, webkitCompassHeading: 300 }, 90), 30);
});
