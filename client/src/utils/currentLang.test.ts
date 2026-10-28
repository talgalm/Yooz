import test from 'node:test';
import assert from 'node:assert/strict';
import { langScope, langStorageKey, allLangStorageKeys, langPrefixOf, localizedPath, withoutLangPrefix } from './currentLang';

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
  assert.equal(langScope('/'), 'site');
  assert.equal(langScope('/home'), 'participant');
});

test('a path that merely starts with a scope word is not that scope', () => {
  assert.equal(langScope('/players-guide'), 'site');
  assert.equal(langScope('/administration'), 'site');
  assert.equal(langScope('/homepage'), 'site');
});

test('manager and manage are told apart, and neither leaks to the other', () => {
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
  assert.ok(!allLangStorageKeys().includes('yooz_lang'));
});

test('a site address names its language only when it is not the default one', () => {
  assert.equal(langPrefixOf('/en'), 'en');
  assert.equal(langPrefixOf('/en/business'), 'en');
  assert.equal(langPrefixOf('/'), null);
  assert.equal(langPrefixOf('/business'), null);
  assert.equal(langPrefixOf('/he/business'), null);
  assert.equal(langPrefixOf('/english'), null);
});

test('moving a page between languages keeps the page and swaps only the prefix', () => {
  assert.equal(localizedPath('/', 'en'), '/en');
  assert.equal(localizedPath('/business', 'en'), '/en/business');
  assert.equal(localizedPath('/en/business', 'he'), '/business');
  assert.equal(localizedPath('/en', 'he'), '/');
  assert.equal(localizedPath('/en/business', 'en'), '/en/business');
  assert.equal(withoutLangPrefix('/en/about'), '/about');
});

test('an English marketing page is still the site scope', () => {
  assert.equal(langScope('/en'), 'site');
  assert.equal(langScope('/en/business'), 'site');
});
