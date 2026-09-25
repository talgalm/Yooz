import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './OpenInBrowserPrompt.i18n';
import { isInAppBrowser, isUnverifiableIOS, escapeToDefaultBrowser, ESCAPED_PARAM, QR_SCAN_PARAM } from '../utils/inAppBrowserEscape';
import { ModalCard, PrimaryButton, OutlineButton, Title, BodyText } from './styled';

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
const ESCAPED_KEY = 'yooz_escaped_to_browser';

function consumeEscapedParam(): boolean {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(ESCAPED_PARAM)) return false;
  try {
    localStorage.setItem(ESCAPED_KEY, '1');
  } catch {
  }
  url.searchParams.delete(ESCAPED_PARAM);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return true;
}
let escapeTried = false;

export default function OpenInBrowserPrompt() {
  const t = useTranslations(texts);
  const [open, setOpen] = useState(false);

  const inApp = typeof navigator !== 'undefined' && isInAppBrowser();

  useEffect(() => {
    if (consumeEscapedParam()) return;
    try {
      if (localStorage.getItem(ESCAPED_KEY)) return;
    } catch {
    }
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
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
        <PrimaryButton type="button" onClick={() => escapeToDefaultBrowser(true)}>{t.open}</PrimaryButton>
        <OutlineButton type="button" onClick={dismiss} style={{ marginTop: 8 }}>{t.stay}</OutlineButton>
      </ModalCard>
    </Overlay>
  );
}
