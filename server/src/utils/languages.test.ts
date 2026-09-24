import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANG, languageOf, isLanguage } from './languages';

/**
 * Adding a language is meant to be one row here and one row in the client's
 * registry. These are the checks that keep that true: a row missing a field,
 * or a language added to one side only, used to surface as a participant
 * hearing silence rather than as a failure anyone could see.
 */

test('every language carries everything the app needs from it', () => {
  for (const lang of LANGUAGES) {
    assert.ok(lang.code, 'a language needs a code');
    assert.ok(lang.name, `${lang.code}: needs an English name, for model prompts`);
    assert.match(lang.locale, /^[a-z]{2}-[A-Z]{2}$/, `${lang.code}: needs a BCP-47 locale`);
    assert.ok(lang.voices.man, `${lang.code}: needs a voice, or speech plays as silence`);
    assert.ok(lang.voices.woman, `${lang.code}: needs a voice, or speech plays as silence`);
    assert.match(
      lang.voices.man,
      new RegExp(`^${lang.locale}-`),
      `${lang.code}: the voice must belong to this language's locale`
    );
    assert.match(lang.voices.woman, new RegExp(`^${lang.locale}-`));
  }
});

test('codes are unique and the default is one of them', () => {
  assert.equal(new Set(LANGUAGE_CODES).size, LANGUAGE_CODES.length);
  assert.ok(LANGUAGE_CODES.includes(DEFAULT_LANG));
});

test('an unknown code falls back to the default rather than throwing', () => {
  assert.equal(languageOf('kl').code, DEFAULT_LANG);
  assert.equal(languageOf('').code, DEFAULT_LANG);
  assert.equal(isLanguage('kl'), false);
  assert.equal(isLanguage(DEFAULT_LANG), true);
});

test('the client registry offers exactly the same languages', () => {
  // Read as text on purpose: the client is a separate package with its own
  // tsconfig, and importing across that line is what this check exists to
  // avoid needing. If the file moves, this fails loudly and says so.
  const file = path.resolve(__dirname, '../../../client/src/utils/languages.ts');
  assert.ok(fs.existsSync(file), `client registry not found at ${file} - has it moved?`);

  const source = fs.readFileSync(file, 'utf8');
  const clientCodes = [...source.matchAll(/code:\s*'([a-z]{2})'/g)].map((m) => m[1]);
  assert.ok(clientCodes.length > 0, 'could not read any language out of the client registry');
  assert.deepEqual(
    [...clientCodes].sort(),
    [...LANGUAGE_CODES].sort(),
    'the client and server language registries disagree - add the row to both'
  );
});

test('the locale of each language matches on both sides', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../../client/src/utils/languages.ts'),
    'utf8'
  );
  for (const lang of LANGUAGES) {
    const row = new RegExp(`code:\\s*'${lang.code}'[^}]*locale:\\s*'([^']+)'`).exec(source);
    assert.ok(row, `${lang.code}: no locale in the client registry`);
    assert.equal(row[1], lang.locale, `${lang.code}: locale differs between client and server`);
  }
});
