import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCAN_CODE_ALPHABET,
  SCAN_CODE_LENGTH,
  emptyScanSettings,
  matchesScanCode,
  newScanCode,
  normalizeScanCode,
  scanPayload,
  scanSettingsFrom,
  scanSettingsToSave,
} from './scanCode';

test('a new code is six characters from the unambiguous alphabet', () => {
  for (let i = 0; i < 50; i++) {
    const code = newScanCode();
    assert.equal(code.length, SCAN_CODE_LENGTH);
    assert.ok([...code].every((c) => SCAN_CODE_ALPHABET.includes(c)), code);
  }
  assert.equal(newScanCode(() => new Uint8Array([0, 1, 2, 31, 32, 33])), 'ABC9AB');
});

test('the barcode carries the code behind a YOOZ prefix', () => {
  assert.equal(scanPayload('k7p2qx'), 'YOOZ:K7P2QX');
});

test('the scanned barcode and the typed code both match', () => {
  assert.ok(matchesScanCode('YOOZ:K7P2QX', 'K7P2QX'));
  assert.ok(matchesScanCode(' k7p-2qx ', 'K7P2QX'));
  assert.ok(matchesScanCode('yooz:k7p2qx', 'K7P2QX'));
});

test('another station barcode, a stray QR or an empty code never match', () => {
  assert.equal(matchesScanCode('YOOZ:AAAAAA', 'K7P2QX'), false);
  assert.equal(matchesScanCode('https://example.com', 'K7P2QX'), false);
  assert.equal(matchesScanCode('', ''), false);
  assert.equal(matchesScanCode('YOOZ:', ''), false);
});

test('normalizing drops the prefix, spaces and dashes', () => {
  assert.equal(normalizeScanCode(' yooz:ab-12 cd '), 'AB12CD');
});

test('settings read back with safe defaults', () => {
  assert.deepEqual(scanSettingsFrom({ code: 'yooz:k7p2qx', rewardType: 'gif', rewardMediaUrl: 'x.png' }), {
    ...emptyScanSettings('K7P2QX'),
  });
  assert.equal(scanSettingsFrom({ code: 'K7P2QX', rewardType: 'video', rewardMediaUrl: 'v.mp4' }).rewardMediaUrl, 'v.mp4');
});

test('saving trims text and keeps media only for an image or video reward', () => {
  const settings = { ...emptyScanSettings('K7P2QX'), title: '  מצאו את הברקוד ', rewardText: ' ', rewardMediaUrl: 'a.png' };
  assert.deepEqual(scanSettingsToSave(settings), { code: 'K7P2QX', rewardType: 'message', title: 'מצאו את הברקוד' });
  assert.deepEqual(scanSettingsToSave({ ...settings, rewardType: 'image' }), {
    code: 'K7P2QX',
    rewardType: 'image',
    title: 'מצאו את הברקוד',
    rewardMediaUrl: 'a.png',
  });
});
