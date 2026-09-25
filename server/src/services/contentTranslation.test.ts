import test from 'node:test';
import assert from 'node:assert/strict';
import { collectProse, applyTranslations, cacheKey, translateText } from './contentTranslation';

test('Hebrew prose is collected, once per distinct sentence', () => {
  const payload = {
    items: [
      { name: 'תחנת הפתיחה', settings: { question: 'מה גובה המגדל?' } },
      { name: 'תחנת הפתיחה', settings: { question: 'כמה מדרגות יש?' } },
    ],
  };
  assert.deepEqual([...collectProse(payload)].sort(), ['כמה מדרגות יש?', 'מה גובה המגדל?', 'תחנת הפתיחה'].sort());
});

test('anything without Hebrew is left out', () => {
  assert.deepEqual([...collectProse({ title: 'Welcome aboard', count: 4, on: true })], []);
});

test('technical fields are never translated, Hebrew or not', () => {
  const payload = {
    _id: 'abc',
    type: 'station',
    url: 'https://example.com/תמונה.png',
    backgroundImage: '/images/רקע.png',
    color: '#FF00AA',
    name: 'תחנה ראשונה',
  };
  assert.deepEqual([...collectProse(payload)], ['תחנה ראשונה']);
});

test('a URL sitting in a prose field is still not prose', () => {
  assert.deepEqual([...collectProse({ body: 'https://example.com/עמוד' })], []);
  assert.deepEqual([...collectProse({ body: '/media/קובץ.mp4' })], []);
});

test('applying a translation keeps the shape and leaves the unknown alone', () => {
  const payload = { items: [{ name: 'תחנה', hint: 'רמז' }], meta: { code: 'ABC123' } };
  const out = applyTranslations(payload, new Map([['תחנה', 'Station']]));
  assert.deepEqual(out, { items: [{ name: 'Station', hint: 'רמז' }], meta: { code: 'ABC123' } });
});

test('applying does not mutate the payload it was given', () => {
  const payload = { name: 'תחנה' };
  applyTranslations(payload, new Map([['תחנה', 'Station']]));
  assert.equal(payload.name, 'תחנה');
});

test('a translated string in a skipped field stays untouched', () => {
  const out = applyTranslations({ code: 'תחנה', name: 'תחנה' }, new Map([['תחנה', 'Station']]));
  assert.deepEqual(out, { code: 'תחנה', name: 'Station' });
});

test('numbers, booleans and null survive the round trip', () => {
  const payload = { score: 10, done: false, next: null, name: 'תחנה' };
  assert.deepEqual(applyTranslations(payload, new Map()), payload);
});

test('the cache key is per language and per exact wording', () => {
  assert.notEqual(cacheKey('en', 'שלום'), cacheKey('ru', 'שלום'));
  assert.notEqual(cacheKey('en', 'שלום'), cacheKey('en', 'שלום!'));
  assert.equal(cacheKey('en', 'שלום'), cacheKey('en', 'שלום'));
});

/**
 * `translateText` is what the server uses for the sentences it writes itself -
 * an avatar's stock reaction, the collage share page. Both guards below must
 * return before any model call, so they are safe to run with no database.
 */
test('the default language is handed straight back, untouched', async () => {
  assert.equal(await translateText('שלום', 'he'), 'שלום');
  assert.equal(await translateText('שלום', ''), 'שלום');
});

test('text already in another language is not round-tripped', async () => {
  // A model answer written in the participant's language reaches the same
  // boundary as an authored Hebrew one; translating it again would mangle it.
  const english = "Hmm, that's not quite the safest approach.";
  assert.equal(await translateText(english, 'en'), english);
  assert.equal(await translateText('', 'en'), '');
});
