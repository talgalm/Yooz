import test from 'node:test';
import assert from 'node:assert/strict';
import { readLang, normaliseLang } from './requestLang';

const req = (headers: Record<string, unknown> = {}, query: Record<string, unknown> = {}) =>
  ({ headers, query }) as never;

test('the header carries the language', () => {
  assert.equal(readLang(req({ 'x-yooz-lang': 'en' })), 'en');
});

test('a query parameter works too, for links and for testing by hand', () => {
  assert.equal(readLang(req({}, { lang: 'en' })), 'en');
});

test('the header wins over the query', () => {
  assert.equal(readLang(req({ 'x-yooz-lang': 'he' }, { lang: 'en' })), 'he');
});

test('nothing sent means Hebrew', () => {
  assert.equal(readLang(req()), 'he');
});

test('a language we do not have falls back to Hebrew, it does not throw', () => {
  for (const raw of ['fr', 'klingon', '', '  ', 42, null, undefined, {}]) {
    assert.equal(normaliseLang(raw), 'he');
  }
});

test('regional and Accept-Language shapes are understood', () => {
  assert.equal(normaliseLang('en-US'), 'en');
  assert.equal(normaliseLang('EN'), 'en');
  assert.equal(normaliseLang('en_GB'), 'en');
  assert.equal(normaliseLang('en,he;q=0.8'), 'en');
});
