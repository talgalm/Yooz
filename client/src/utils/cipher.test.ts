import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REEL_LENGTH, cipherDirection, cipherSlots, cleanCipherInput, reelStrip, unseenSlots } from './cipher';

const shin = String.fromCharCode(0x05e9);
const alef = String.fromCharCode(0x05d0);
const items = [{ cipherChar: '4' }, {}, { cipherChar: '7' }, { cipherChar: '1' }];

test('only stations with a character get a slot, in station order', () => {
  assert.deepEqual(cipherSlots(items, [0, 1]), [
    { itemIndex: 0, char: '4', revealed: true },
    { itemIndex: 2, char: '7', revealed: false },
    { itemIndex: 3, char: '1', revealed: false },
  ]);
});

test('a Hebrew cipher reads right to left, digits and Latin left to right', () => {
  assert.equal(cipherDirection(cipherSlots([{ cipherChar: shin }, { cipherChar: '3' }], [])), 'rtl');
  assert.equal(cipherDirection(cipherSlots([{ cipherChar: '9' }, { cipherChar: 'A' }], [])), 'ltr');
});

test('unseen slots are the revealed ones not shown yet', () => {
  const slots = cipherSlots(items, [0, 2]);
  assert.deepEqual(unseenSlots(slots, [0]), [2]);
  assert.deepEqual(unseenSlots(slots, [0, 2]), []);
});

test('a reel spins through its own kind of character and lands on the real one', () => {
  const strip = reelStrip('7', 3);
  assert.equal(strip.length, REEL_LENGTH);
  assert.equal(strip[REEL_LENGTH - 1], '7');
  assert.ok(strip.every((c) => /\d/.test(c)));
  assert.deepEqual(reelStrip('7', 3), strip);
  assert.ok(reelStrip(alef, 1).slice(0, -1).every((c) => c.charCodeAt(0) >= 0x05d0 && c.charCodeAt(0) <= 0x05ea));
});

test('admin input keeps at most two characters', () => {
  assert.equal(cleanCipherInput(' 12 '), '12');
  assert.equal(cleanCipherInput('abc'), 'ab');
  assert.equal(cleanCipherInput('   '), '');
});
