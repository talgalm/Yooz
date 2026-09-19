import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './OpenInBrowserPrompt.i18n';
import { isInAppBrowser, isUnverifiableIOS, escapeToDefaultBrowser, ESCAPED_PARAM, QR_SCAN_PARAM } from '../utils/inAppBrowserEscape';
import { ModalCard, PrimaryButton, OutlineButton, Title, BodyText } from './styled';

// Above every other overlay (opening video, help chat, popups — max in app is 99999).
const Overlay = styled.div({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 100000,
});

const DISMISSED_KEY = 'yooz_inapp_prompt_done';
// localStorage, not session: this browser received a handoff, so it IS the real
// browser and must never prompt again. An in-app webview has its own isolated
// storage, so the flag cannot leak back and silence the prompt where it matters.
const ESCAPED_KEY = 'yooz_escaped_to_browser';

/** Consume the handoff marker: remember this browser, and drop the param from the URL. */
function consumeEscapedParam(): boolean {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(ESCAPED_PARAM)) return false;
  try {
    localStorage.setItem(ESCAPED_KEY, '1');
  } catch {
    /* private mode */
  }
  url.searchParams.delete(ESCAPED_PARAM);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return true;
}
// Per page load, not per session — a failed escape must not silence the hint.
let escapeTried = false;

/**
 * QR scanners and social apps open links in an in-app browser that closes with
 * the host app, taking the participant's tab with it. Two cases:
 *  - Detected webview (Instagram, WhatsApp, Android scanner apps): bounce out
 *    automatically, and offer the button if the webview blocked the redirect.
 *  - iOS, where SFSafariViewController is indistinguishable from Safari: only
 *    ask when the URL came from the QR, and never redirect on our own — the
 *    same check would fire on someone who simply typed the address.
 * Shown at most once; the browser that receives a handoff never asks again.
 */
export default function OpenInBrowserPrompt() {
  const t = useTranslations(texts);
  const [open, setOpen] = useState(false);

  const inApp = typeof navigator !== 'undefined' && isInAppBrowser();

  useEffect(() => {
    if (consumeEscapedParam()) return;
    try {
      if (localStorage.getItem(ESCAPED_KEY)) return;
    } catch {
      /* private mode */
    }
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Safari and SFSafariViewController are indistinguishable, so on iOS we only
    // ask when the URL came from a QR — a link opened by hand is left alone.
    const fromQr = new URLSearchParams(window.location.search).has(QR_SCAN_PARAM);
    if (!inApp && !(fromQr && isUnverifiableIOS())) return;
    if (inApp && !escapeTried) {
      escapeTried = true;
      escapeToDefaultBrowser();
    }
    const timer = setTimeout(() => {
      if (!document.hidden) setOpen(true);
    }, inApp ? 1200 : 400);
    return () => clearTimeout(timer);
  }, [inApp]);

  if (!open) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  };

  return (
    <Overlay>
      <ModalCard>
        <Title>{t.title}</Title>
        <BodyText>{inApp ? t.inApp : t.maybeInApp}</BodyText>
        {/* force: in the unverifiable-iOS case the webview check says "not in-app",
            but the user asked for it — a tap is also what unblocks scheme
            redirects in webviews that ignore them without a gesture. */}
        <PrimaryButton type="button" onClick={() => escapeToDefaultBrowser(true)}>{t.open}</PrimaryButton>
        <OutlineButton type="button" onClick={dismiss} style={{ marginTop: 8 }}>{t.stay}</OutlineButton>
      </ModalCard>
    </Overlay>
  );
}
