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

/** Attempt to reopen the current URL in the default browser. Returns true if a redirect was attempted. */
export function escapeToDefaultBrowser(): boolean {
  if (!isInAppBrowser()) return false;
  const ua = navigator.userAgent;
  const urlNoScheme = window.location.href.replace(/^https?:\/\//, '');
  try {
    if (/Android/i.test(ua)) {
      window.location.href = `intent://${urlNoScheme}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      return true;
    }
    if (isIOS(ua)) {
      window.location.href = `x-safari-https://${urlNoScheme}`;
      return true;
    }
  } catch {
    // Webview blocked the custom scheme — stay where we are.
  }
  return false;
}
