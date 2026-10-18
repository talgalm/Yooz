import test from 'node:test';
import assert from 'node:assert/strict';
import { cipherRows } from './cipherRows';

const sizes = (count: number) => cipherRows(Array.from({ length: count }, (_, i) => i)).map((row) => row.length);

test('up to eight characters stay on one row', () => {
  assert.deepEqual(sizes(1), [1]);
  assert.deepEqual(sizes(8), [8]);
});

test('nine and more split into balanced rows of at most eight', () => {
  assert.deepEqual(sizes(9), [5, 4]);
  assert.deepEqual(sizes(10), [5, 5]);
  assert.deepEqual(sizes(16), [8, 8]);
  assert.deepEqual(sizes(17), [6, 6, 5]);
  assert.deepEqual(cipherRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']).flat().join(''), 'abcdefghi');
});
