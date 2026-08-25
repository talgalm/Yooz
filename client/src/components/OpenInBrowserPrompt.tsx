import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { isInAppBrowser, isUnverifiableIOS, escapeToDefaultBrowser } from '../utils/inAppBrowserEscape';
import { activityCodeFromPathname } from '../utils/participantActivity';
import { ModalCard, PrimaryButton, OutlineButton, Title, BodyText, TEXT_LIGHT } from './styled';

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

const Fallback = styled.div({
  fontSize: 13,
  color: TEXT_LIGHT,
  lineHeight: 1.6,
  marginTop: 14,
  paddingTop: 12,
  borderTop: '1px solid #eee',
});

const Code = styled.strong({ fontSize: 16, letterSpacing: 2, color: '#4b3b8f' });

const texts = {
  en: {
    title: 'Open in your browser',
    inApp: 'This link opened inside an app. Open it in your phone browser so you keep your place.',
    ios: 'Tap the share / ••• icon and choose "Open in Safari".',
    android: 'Tap the ••• icon at the top and choose "Open in browser".',
    maybeInApp: 'If this opened from a scanner app, tap the compass icon at the bottom to continue in Safari — that window can close and take your game with it.',
    open: 'Open in browser',
    copy: 'Copy link',
    copied: 'Link copied',
    stay: 'Continue',
    lostPrefix: 'Lost this page? Go to yooz.org.il and enter your code:',
  },
  he: {
    title: 'פתחו בדפדפן',
    inApp: 'הקישור נפתח בתוך אפליקציה. פתחו אותו בדפדפן של הטלפון כדי לא לאבד את המקום שלכם.',
    ios: 'לחצו על אייקון השיתוף / ••• ובחרו "פתח בספארי".',
    android: 'לחצו על ••• בחלק העליון ובחרו "פתח בדפדפן".',
    maybeInApp: 'אם הגעתם מאפליקציית סריקה, לחצו על אייקון המצפן בתחתית המסך כדי להמשיך בספארי — החלון הזה עלול להיסגר ולקחת איתו את המשחק.',
    open: 'פתחו בדפדפן',
    copy: 'העתקת הקישור',
    copied: 'הקישור הועתק',
    stay: 'המשך',
    lostPrefix: 'איבדתם את הדף? היכנסו ל-yooz.org.il והזינו את הקוד:',
  },
};

const DISMISSED_KEY = 'yooz_inapp_prompt_done';
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
  const code = activityCodeFromPathname(window.location.pathname);

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
        {inApp ? (
          <>
            <BodyText>{t.inApp}</BodyText>
            <BodyText>{isIOS ? t.ios : t.android}</BodyText>
            {/* Retrying from a tap works in webviews that block scheme redirects without a user gesture. */}
            <PrimaryButton type="button" onClick={() => escapeToDefaultBrowser()}>{t.open}</PrimaryButton>
            <OutlineButton type="button" onClick={copy} style={{ marginTop: 8 }}>
              {copied ? t.copied : t.copy}
            </OutlineButton>
          </>
        ) : (
          <BodyText>{t.maybeInApp}</BodyText>
        )}
        <OutlineButton type="button" onClick={dismiss} style={{ marginTop: 8 }}>{t.stay}</OutlineButton>
        {code && (
          <Fallback>
            {t.lostPrefix} <Code>{code}</Code>
          </Fallback>
        )}
      </ModalCard>
    </Overlay>
  );
}
