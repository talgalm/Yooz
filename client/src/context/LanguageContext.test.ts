import test from 'node:test';
import assert from 'node:assert';
import { fillFrom, LANGS, DEFAULT_LANG } from './LanguageContext';

test('a language that translates nothing gets Hebrew wholesale', () => {
  const he = { start: 'התחל', score: 'ניקוד' };
  assert.deepStrictEqual(fillFrom(he, undefined), he);
});

test('a partial translation keeps its own keys and borrows the rest', () => {
  const he = { start: 'התחל', score: 'ניקוד' };
  assert.deepStrictEqual(fillFrom(he, { start: 'Start' }), { start: 'Start', score: 'ניקוד' });
});

test('nested objects merge key by key, not wholesale', () => {
  const he = { hint: { title: 'רמז', close: 'הבנתי' }, score: 'ניקוד' };
  assert.deepStrictEqual(fillFrom(he, { hint: { title: 'Hint' } }), {
    hint: { title: 'Hint', close: 'הבנתי' },
    score: 'ניקוד',
  });
});

test('functions and arrays are taken whole, never merged into', () => {
  const he = { plural: (n: number) => `${n} נקודות`, order: ['א', 'ב'] };
  const en = { plural: (n: number) => `${n} points`, order: ['a'] };
  const out = fillFrom(he, en);
  assert.strictEqual(out.plural(3), '3 points');
  assert.deepStrictEqual(out.order, ['a']);
});

test('a key only the new language has still comes through', () => {
  assert.deepStrictEqual(fillFrom({ a: '1' }, { b: '2' }), { a: '1', b: '2' });
});

test('the fallback language is the first row of LANGS', () => {
  assert.strictEqual(LANGS[0].code, DEFAULT_LANG);
  assert.strictEqual(new Set(LANGS.map((l) => l.code)).size, LANGS.length);
});
