import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { isInAppBrowser, isUnverifiableIOS, escapeToDefaultBrowser, ESCAPED_PARAM } from '../utils/inAppBrowserEscape';
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

const texts = {
  en: {
    title: 'Open in your browser',
    inApp: 'This link opened inside an app. Open it in your phone browser so you keep your place.',
    maybeInApp: 'If this opened from inside an app, that window can close and take your game with it. Open it in your browser to keep your place.',
    open: 'Open in browser',
    ios: 'Didn’t open? Tap the compass icon at the bottom, or share → "Open in Safari".',
    android: 'Didn’t open? Tap the ••• icon at the top and choose "Open in browser".',
    copy: 'Copy link',
    copied: 'Link copied',
    stay: 'Continue',
  },
  he: {
    title: 'פתחו בדפדפן',
    inApp: 'הקישור נפתח בתוך אפליקציה. פתחו אותו בדפדפן של הטלפון כדי לא לאבד את המקום שלכם.',
    maybeInApp: 'אם הדף נפתח מתוך אפליקציה, החלון הזה עלול להיסגר ולקחת איתו את המשחק. פתחו אותו בדפדפן כדי לשמור את המקום שלכם.',
    open: 'פתחו בדפדפן',
    ios: 'לא נפתח? לחצו על אייקון המצפן בתחתית המסך, או על השיתוף ← "פתח בספארי".',
    android: 'לא נפתח? לחצו על ••• בחלק העליון ובחרו "פתח בדפדפן".',
    copy: 'העתקת הקישור',
    copied: 'הקישור הועתק',
    stay: 'המשך',
  },
};

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
 * the host app. Two cases:
 *  - Detected webview (Instagram, WhatsApp, scanner apps): bounce out automatically,
 *    and if the webview blocks that, show the manual instructions.
 *  - iOS where we can't tell Safari from SFSafariViewController: never redirect
 *    (it might be real Safari) — just hint, once.
 * Either way, show the activity code so a participant who does get thrown out
 * can walk back in from any browser.
 */
export default function OpenInBrowserPrompt() {
  const t = useTranslations(texts);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inApp = typeof navigator !== 'undefined' && isInAppBrowser();

  useEffect(() => {
    if (consumeEscapedParam()) return;
    try {
      if (localStorage.getItem(ESCAPED_KEY)) return;
    } catch {
      /* private mode */
    }
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    if (!inApp && !isUnverifiableIOS()) return;
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

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
        <BodyText style={{ fontSize: 13, marginTop: 10 }}>{isIOS ? t.ios : t.android}</BodyText>
        <OutlineButton type="button" onClick={copy} style={{ marginTop: 8 }}>
          {copied ? t.copied : t.copy}
        </OutlineButton>
        <OutlineButton type="button" onClick={dismiss} style={{ marginTop: 8 }}>{t.stay}</OutlineButton>
      </ModalCard>
    </Overlay>
  );
}
