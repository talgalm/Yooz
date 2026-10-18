import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REEL_LENGTH, cipherCodeChars, cipherCodeCoverage, cipherDirection, cipherSlots, cleanCipherInput, fixedCipherSlots, placedCipherSlots, reelStrip, unseenSlots } from './cipher';

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

test('a fixed code reveals in its own order, whatever station a route reaches first', () => {
  const route = [{ cipherChar: 'I' }, {}, { cipherChar: 'A' }, { cipherChar: 'H' }];
  assert.deepEqual(fixedCipherSlots('HaifaUni', route, [0]).map((slot) => slot.revealed), [true, false, false, false, false, false, false, false]);
  assert.deepEqual(fixedCipherSlots('HaifaUni', route, [0, 1, 2]).filter((slot) => slot.revealed).map((slot) => slot.char), ['H', 'a']);
  assert.deepEqual(fixedCipherSlots('HaifaUni', route, []).map((slot) => slot.char).join(''), 'HaifaUni');
  assert.deepEqual(fixedCipherSlots('HaifaUni', route, [0, 2, 3]).map((slot) => slot.itemIndex), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('spaces in a fixed code are not characters', () => {
  assert.deepEqual(cipherCodeChars(' Haifa Uni '), ['H', 'a', 'i', 'f', 'a', 'U', 'n', 'i']);
});

test('in place, each station reveals its own letter where it sits in the code', () => {
  const route = [{ cipherChar: 'F' }, { cipherChar: 'a' }, {}, { cipherChar: 'A' }, { cipherChar: 'X' }];
  const shown = (done: number[]) => placedCipherSlots('HaifaUni', route, done).map((slot) => (slot.revealed ? slot.char : '_')).join('');
  assert.equal(shown([0]), '___f____');
  assert.equal(shown([0, 1]), '_a_f____');
  assert.equal(shown([0, 1, 3]), '_a_fa___');
  assert.equal(shown([4]), '________');
  assert.deepEqual(placedCipherSlots('HaifaUni', route, [0]).map((slot) => slot.itemIndex), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('the wizard can tell which code letters no station reveals', () => {
  assert.deepEqual(cipherCodeCoverage('HaifaUni', ['A', 'I', 'H', 'U', 'A', 'N', 'F', 'I']), { missing: [], extra: [] });
  assert.deepEqual(cipherCodeCoverage('HaifaUni', ['h', 'a', 'Z']), { missing: ['i', 'f', 'a', 'U', 'n', 'i'], extra: ['Z'] });
});
