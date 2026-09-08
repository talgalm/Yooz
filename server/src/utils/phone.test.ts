import test from 'node:test';
import assert from 'node:assert';
import { normalizePhone } from './phone';

test('normalizePhone folds formatting and country code to one form', () => {
  const expected = '0501234567';
  assert.strictEqual(normalizePhone('050-123-4567'), expected);
  assert.strictEqual(normalizePhone(' 050 1234567 '), expected);
  assert.strictEqual(normalizePhone('+972-50-123-4567'), expected);
  assert.strictEqual(normalizePhone('972501234567'), expected);
  assert.strictEqual(normalizePhone(''), '');
});
