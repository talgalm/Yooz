import test from 'node:test';
import assert from 'node:assert';
import { normalizePhone } from './phone';

test('normalizePhone folds Israeli mobile formats to one form', () => {
  const expected = '0501234567';
  for (const raw of [
    '0501234567',
    '050-123-4567',
    '050 123 4567',
    ' 050.1234567 ',
    '(050) 123-4567',
    '+972501234567',
    '+972-50-123-4567',
    '+972 50 1234567',
    '972501234567',
    '00972501234567',
    '011972501234567',
    '+9720501234567',
  ]) {
    assert.strictEqual(normalizePhone(raw), expected, raw);
  }
});

test('normalizePhone folds Israeli landline formats', () => {
  for (const raw of ['031234567', '03-123-4567', '+972-3-1234567', '00972 3 1234567']) {
    assert.strictEqual(normalizePhone(raw), '031234567', raw);
  }
});

test('normalizePhone matches foreign numbers written internationally', () => {
  assert.strictEqual(normalizePhone('+1-415-555-0123'), '14155550123');
  assert.strictEqual(normalizePhone('001 415 555 0123'), '14155550123');
  assert.strictEqual(normalizePhone('+44 20 7123 4567'), '442071234567');
});

test('normalizePhone keeps junk out', () => {
  assert.strictEqual(normalizePhone(''), '');
  assert.strictEqual(normalizePhone('not a phone'), '');
});
