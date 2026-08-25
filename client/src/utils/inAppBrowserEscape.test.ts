// Run: npx tsx --test src/utils/inAppBrowserEscape.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_WEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const INSTAGRAM = `${SAFARI} Instagram 302.0.0.23.113`;
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 13; SM-S901B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

function setUA(ua: string, standalone?: boolean) {
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: ua, standalone }, configurable: true });
  Object.defineProperty(globalThis, 'window', {
    value: { matchMedia: () => ({ matches: false }) },
    configurable: true,
  });
}

const { isInAppBrowser, isUnverifiableIOS, externalBrowserUrl } = await import('./inAppBrowserEscape.js');

test('in-app webviews are detected', () => {
  for (const ua of [INSTAGRAM, IOS_WEBVIEW, ANDROID_WEBVIEW]) {
    setUA(ua);
    assert.equal(isInAppBrowser(), true, ua);
  }
});

test('real browsers are not treated as webviews', () => {
  for (const ua of [SAFARI, CHROME_IOS, ANDROID_CHROME]) {
    setUA(ua);
    assert.equal(isInAppBrowser(), false, ua);
  }
});

test('only unprovable iOS contexts get the soft hint', () => {
  setUA(SAFARI);
  assert.equal(isUnverifiableIOS(), true, 'Safari and SFSafariViewController are indistinguishable');
  setUA(CHROME_IOS);
  assert.equal(isUnverifiableIOS(), false, 'Chrome iOS has its own tabs');
  setUA(SAFARI, true);
  assert.equal(isUnverifiableIOS(), false, 'installed PWA');
  setUA(ANDROID_CHROME);
  assert.equal(isUnverifiableIOS(), false, 'not iOS');
});

test('handoff URL carries the marker so the receiving browser stops prompting', () => {
  const ios = externalBrowserUrl(SAFARI, 'https://yooz.org.il/play/abc123');
  assert.equal(ios, 'x-safari-https://yooz.org.il/play/abc123?fromapp=1');

  const android = externalBrowserUrl(ANDROID_WEBVIEW, 'https://yooz.org.il/play/abc123?lang=en');
  assert.ok(android?.startsWith('intent://yooz.org.il/play/abc123?lang=en&fromapp=1#Intent;'), android!);

  // the scan marker must not ride along, or the handed-off tab would re-ask
  const fromScan = externalBrowserUrl(SAFARI, 'https://yooz.org.il/play/abc123?qr=1');
  assert.equal(fromScan, 'x-safari-https://yooz.org.il/play/abc123?fromapp=1');

  assert.equal(externalBrowserUrl('Mozilla/5.0 (Windows NT 10.0)', 'https://yooz.org.il/'), null);
});
