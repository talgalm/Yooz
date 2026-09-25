import test from 'node:test';
import assert from 'node:assert/strict';
import { replyLanguageInstruction } from './promptLanguage';

test('Hebrew adds nothing - the prompt already says so', () => {
  assert.equal(replyLanguageInstruction('he'), '');
});

test('another language is stated plainly, and overrides the prompt', () => {
  const line = replyLanguageInstruction('en');
  assert.match(line, /Reply only in English/);
  assert.match(line, /overrides any earlier instruction/);
});

test('a language we do not have changes nothing', () => {
  for (const raw of ['zz', '', 'klingon']) assert.equal(replyLanguageInstruction(raw), '');
});
