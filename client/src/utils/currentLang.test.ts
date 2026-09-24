import test from 'node:test';
import assert from 'node:assert/strict';
import { langScope, langStorageKey, allLangStorageKeys } from './currentLang';

test('the pages a participant plays are their own scope', () => {
  for (const p of [
    '/play/ABC123',
    '/play/ABC123/join/tok',
    '/home',
    '/story/ABC123',
    '/mission/ABC123',
    '/portal/ABC123',
  ]) {
    assert.equal(langScope(p), 'participant', p);
  }
});

test('every staff panel shares the one staff preference', () => {
  for (const p of [
    '/admin/login',
    '/admin/activities/1/edit',
    '/manager/dashboard',
    '/manage/my-work',
    '/control/1',
  ]) {
    assert.equal(langScope(p), 'admin', p);
  }
});

test('the marketing site and anything public is the site scope', () => {
  for (const p of ['/', '/business', '/academy', '/tourism', '/about', '/privacy', '/stats/tok']) {
    assert.equal(langScope(p), 'site', p);
  }
});

test('the marketing home is not the participant home', () => {
  // `/` and `/home` are different products; a prefix match would merge them.
  assert.equal(langScope('/'), 'site');
  assert.equal(langScope('/home'), 'participant');
});

test('a path that merely starts with a scope word is not that scope', () => {
  assert.equal(langScope('/players-guide'), 'site');
  assert.equal(langScope('/administration'), 'site');
  assert.equal(langScope('/homepage'), 'site');
});

test('manager and manage are told apart, and neither leaks to the other', () => {
  // Both are staff, so both land on the same key - but by matching, not by
  // one being a prefix of the other.
  assert.equal(langScope('/manager'), 'admin');
  assert.equal(langScope('/manage'), 'admin');
});

test('the three scopes are stored under three different keys', () => {
  const keys = allLangStorageKeys();
  assert.equal(new Set(keys).size, 3, 'no two scopes may share a key');
  assert.equal(langStorageKey('participant'), 'yooz_participant_lang');
  assert.equal(langStorageKey('admin'), 'yooz_admin_lang');
  assert.equal(langStorageKey('site'), 'yooz_site_lang');
});

test('the retired shared key is not one of them', () => {
  // `yooz_lang` was the single key all three used; nothing may read it again.
  assert.ok(!allLangStorageKeys().includes('yooz_lang'));
});
