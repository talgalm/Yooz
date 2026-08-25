import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { isInAppBrowser, escapeToDefaultBrowser } from '../utils/inAppBrowserEscape';
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

const UrlText = styled.div({
  fontSize: 12,
  color: TEXT_LIGHT,
  wordBreak: 'break-all',
  marginTop: 12,
  userSelect: 'all',
});

const texts = {
  en: {
    title: 'Open in your browser',
    body: 'This link opened inside an app. Open it in your phone browser so your progress is saved.',
    ios: 'Tap the share / ••• icon and choose "Open in Safari".',
    android: 'Tap the ••• icon at the top and choose "Open in browser".',
    open: 'Open in browser',
    copy: 'Copy link',
    copied: 'Link copied',
    stay: 'Continue here anyway',
  },
  he: {
    title: 'פתחו בדפדפן',
    body: 'הקישור נפתח בתוך אפליקציה. פתחו אותו בדפדפן של הטלפון כדי שההתקדמות שלכם תישמר.',
    ios: 'לחצו על אייקון השיתוף / ••• ובחרו "פתח בספארי".',
    android: 'לחצו על ••• בחלק העליון ובחרו "פתח בדפדפן".',
    open: 'פתחו בדפדפן',
    copy: 'העתקת הקישור',
    copied: 'הקישור הועתק',
    stay: 'המשיכו כאן בכל זאת',
  },
};

const SESSION_KEY = 'yooz_inapp_prompt_done';

/**
 * QR scanners and social apps open links in an in-app webview. We first try to
 * bounce out automatically (Android intent:// / iOS x-safari-https://); if we're
 * still here a moment later the webview blocked it, so we ask the user to do it
 * manually. Once per session, participant routes only.
 */
export default function OpenInBrowserPrompt() {
  const t = useTranslations(texts);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) || !isInAppBrowser()) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    escapeToDefaultBrowser();
    const timer = setTimeout(() => {
      if (!document.hidden) setOpen(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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
        <BodyText>{t.body}</BodyText>
        <BodyText>{isIOS ? t.ios : t.android}</BodyText>
        {/* Retrying from a tap works in webviews that block scheme redirects without a user gesture. */}
        <PrimaryButton type="button" onClick={() => escapeToDefaultBrowser()}>{t.open}</PrimaryButton>
        <OutlineButton type="button" onClick={copy} style={{ marginTop: 8 }}>
          {copied ? t.copied : t.copy}
        </OutlineButton>
        <OutlineButton type="button" onClick={() => setOpen(false)} style={{ marginTop: 8, border: 'none' }}>
          {t.stay}
        </OutlineButton>
        <UrlText>{window.location.href}</UrlText>
      </ModalCard>
    </Overlay>
  );
}
