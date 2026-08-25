/**
 * QR scanner apps and social apps (Instagram, WhatsApp, Facebook, etc.) open
 * links in an embedded in-app webview instead of the user's default browser.
 * This detects that and bounces the current URL out to the real browser:
 *  - Android: intent:// URL — the OS routes it to the default browser.
 *  - iOS: x-safari-https:// scheme — opens Safari.
 * Native camera scans already open the default browser, so this is a no-op there.
 */

// Known in-app browser UA tokens + Android WebView marker ("; wv)").
const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|WhatsApp|WeChat|MicroMessenger|GSA\/|; wv\)/i;

function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  if (IN_APP_UA.test(ua)) return true;
  // iOS WKWebView heuristic: real iOS browsers always end with a "Safari/xxx"
  // token (Chrome iOS = CriOS ... Safari/, Firefox = FxiOS ... Safari/).
  // Embedded webviews (QR scanner apps etc.) omit it.
  if (isIOS(ua) && !/Safari\//.test(ua)) {
    // Installed-PWA mode also lacks the Safari token — don't eject those.
    const standalone = (navigator as { standalone?: boolean }).standalone;
    if (!standalone && !window.matchMedia('(display-mode: standalone)').matches) return true;
  }
  return false;
}

/**
 * iOS SFSafariViewController (what most QR scanner apps use) reports the exact
 * same user agent as real Safari — there is no JS test that separates them. It
 * closes with the host app and its storage is isolated, so a participant loses
 * their tab. True for any iOS context we cannot prove is a real tabbed browser,
 * which includes genuine Safari — callers must only hint here, never redirect.
 */
export function isUnverifiableIOS(): boolean {
  const ua = navigator.userAgent;
  if (!isIOS(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return false; // real third-party browsers, own tabs
  const standalone = (navigator as { standalone?: boolean }).standalone;
  if (standalone || window.matchMedia('(display-mode: standalone)').matches) return false;
  return true;
}

/**
 * Marks the handed-off URL so the receiving browser knows the escape already
 * happened and never offers it again — without this, the real browser shows the
 * same prompt and every tap spawns another tab.
 */
export const ESCAPED_PARAM = 'fromapp';

/** Set on the URL inside the QR code — the only entry point we know is a scan. */
export const QR_SCAN_PARAM = 'qr';

/** The scheme URL that hands `href` to the default browser, or null if this platform has none. */
export function externalBrowserUrl(ua: string, href: string): string | null {
  const marked = new URL(href);
  marked.searchParams.set(ESCAPED_PARAM, '1');
  marked.searchParams.delete(QR_SCAN_PARAM);
  const noScheme = marked.toString().replace(/^https?:\/\//, '');
  if (/Android/i.test(ua)) {
    return `intent://${noScheme}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  }
  if (isIOS(ua)) return `x-safari-https://${noScheme}`;
  return null;
}

/**
 * Attempt to reopen the current URL in the default browser. Returns true if a
 * redirect was attempted. `force` skips the webview check — for a button the
 * user tapped, where an iOS context we could not identify (isUnverifiableIOS)
 * is worth a try even though we never redirect it on our own.
 */
export function escapeToDefaultBrowser(force = false): boolean {
  if (!force && !isInAppBrowser()) return false;
  const target = externalBrowserUrl(navigator.userAgent, window.location.href);
  if (!target) return false;
  try {
    window.location.href = target;
    return true;
  } catch {
    // Webview blocked the custom scheme — stay where we are.
    return false;
  }
}
