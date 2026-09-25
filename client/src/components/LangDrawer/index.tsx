import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import { LANGS, useLang } from '../../context/LanguageContext';
import { storeLang } from '../../utils/currentLang';
import { IconButton, DarkHeaderActionIconButton } from '../styled';
import { GlobeIcon, CheckIcon } from './LangDrawer.icons';

interface LangDrawerProps {
  variant?: 'default' | 'darkHeader' | 'fab';
  only?: string[];
}

const PRIMARY = '#6C5CE7';

const LangFab = styled('button')({
  position: 'fixed',
  bottom: 88,
  insetInlineEnd: 24,
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: PRIMARY,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(108, 92, 231, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 900,
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': { transform: 'scale(1.08)', boxShadow: '0 6px 20px rgba(108, 92, 231, 0.5)' },
  '&:active': { transform: 'scale(0.95)' },
});

const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;
const fadeOut = keyframes`from { opacity: 1 } to { opacity: 0 }`;
const riseUp = keyframes`from { transform: translateY(100%) } to { transform: translateY(0) }`;
const sinkDown = keyframes`from { transform: translateY(0) } to { transform: translateY(100%) }`;

const EXIT_MS = 220;

const Scrim = styled('div', { shouldForwardProp: (p) => p !== 'closing' })<{ closing?: boolean }>(({ closing }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(28,22,48,0.45)',
  zIndex: 1000,
  animation: closing ? `${fadeOut} ${EXIT_MS}ms ease-in forwards` : `${fadeIn} 0.18s ease-out`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: closing ? 0 : 1 },
}));

const Sheet = styled('div', { shouldForwardProp: (p) => p !== 'closing' })<{ closing?: boolean }>(({ closing }) => ({
  position: 'fixed',
  insetInline: 0,
  bottom: 0,
  zIndex: 1001,
  background: '#fff',
  borderRadius: '20px 20px 0 0',
  padding: '10px 0 calc(12px + env(safe-area-inset-bottom, 0px))',
  boxShadow: '0 -8px 32px rgba(40,30,70,0.22)',
  animation: closing
    ? `${sinkDown} ${EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
    : `${riseUp} 0.22s cubic-bezier(0, 0, 0.2, 1)`,
  maxHeight: '70dvh',
  overflowY: 'auto',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}));

const Grip = styled('span')({
  display: 'block',
  width: 40,
  height: 4,
  borderRadius: 999,
  background: '#e2ddf0',
  margin: '2px auto 10px',
});

const Option = styled('button')<{ current?: boolean }>(({ current }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  padding: '15px 22px',
  border: 'none',
  background: current ? '#f4f1ff' : 'transparent',
  color: current ? PRIMARY : '#2d2540',
  fontSize: 17,
  fontWeight: current ? 800 : 600,
  fontFamily: 'inherit',
  textAlign: 'start',
  cursor: 'pointer',
  '&:hover': { background: current ? '#efeaff' : '#f7f6fb' },
}));

export default function LangDrawer({ variant = 'default', only }: LangDrawerProps) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<number | null>(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    exitTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
  };

  useEffect(() => () => {
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
  }, []);

  const available = only
    ? LANGS.filter((l) => l.code === 'he' || l.code === lang || only.includes(l.code))
    : LANGS;

  if (available.length < 2) return null;

  const choose = (code: string) => {
    if (code === lang) {
      close();
      return;
    }
    storeLang(code);
    window.location.reload();
  };

  const Trigger = variant === 'fab' ? LangFab : variant === 'darkHeader' ? DarkHeaderActionIconButton : IconButton;

  return (
    <>
      <Trigger type="button" onClick={() => setOpen(true)} aria-label="Language" aria-haspopup="menu">
        <GlobeIcon size={variant === 'fab' ? 26 : 21} />
      </Trigger>

      {open && createPortal(
        <>
          <Scrim closing={closing} onClick={close} />
          <Sheet closing={closing} role="menu" aria-label="Language">
            <Grip aria-hidden />
            {available.map((l) => (
              <Option
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                current={l.code === lang}
                onClick={() => choose(l.code)}
              >
                <span>{l.label}</span>
                {l.code === lang && <CheckIcon />}
              </Option>
            ))}
          </Sheet>
        </>,
        document.body,
      )}
    </>
  );
}
