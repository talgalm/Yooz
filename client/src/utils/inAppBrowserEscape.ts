
const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|WhatsApp|WeChat|MicroMessenger|GSA\/|; wv\)/i;

function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  if (IN_APP_UA.test(ua)) return true;
  if (isIOS(ua) && !/Safari\//.test(ua)) {
    const standalone = (navigator as { standalone?: boolean }).standalone;
    if (!standalone && !window.matchMedia('(display-mode: standalone)').matches) return true;
  }
  return false;
}

export function isUnverifiableIOS(): boolean {
  const ua = navigator.userAgent;
  if (!isIOS(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return false;
  const standalone = (navigator as { standalone?: boolean }).standalone;
  if (standalone || window.matchMedia('(display-mode: standalone)').matches) return false;
  return true;
}

export const ESCAPED_PARAM = 'fromapp';

export const QR_SCAN_PARAM = 'qr';

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

export function escapeToDefaultBrowser(force = false): boolean {
  if (!force && !isInAppBrowser()) return false;
  const target = externalBrowserUrl(navigator.userAgent, window.location.href);
  if (!target) return false;
  try {
    window.location.href = target;
    return true;
  } catch {
    return false;
  }
}
