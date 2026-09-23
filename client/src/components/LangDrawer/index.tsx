import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import { LANGS, useLang } from '../../context/LanguageContext';
import { IconButton, DarkHeaderActionIconButton } from '../styled';
import { GlobeIcon, CheckIcon } from './LangDrawer.icons';

interface LangDrawerProps {
  /**
   * `darkHeader` matches help / exit on tinted headers (finish, leaderboard…).
   * `fab` is the floating circle used on the login screen, the twin of the help
   * button beside it.
   */
  variant?: 'default' | 'darkHeader' | 'fab';
  /**
   * Languages this activity was prepared in, besides Hebrew. An activity's own
   * content is translated only for the languages it was saved with, so offering
   * more than that would hand a participant an English shell around Hebrew
   * stations. Omit to offer everything the app knows.
   */
  only?: string[];
}

const PRIMARY = '#6C5CE7';

/**
 * Same circle as the help button it sits above, and the same distance off the
 * corner - the two read as one pair of controls. A globe, not a flag: a flag
 * names a country rather than a language, and renders as bare letters on
 * Windows anyway.
 */
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

/** How long the sheet takes to leave; the unmount waits exactly this long. */
const EXIT_MS = 220;

const Scrim = styled('div', { shouldForwardProp: (p) => p !== 'closing' })<{ closing?: boolean }>(({ closing }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(28,22,48,0.45)',
  zIndex: 1000,
  animation: closing ? `${fadeOut} ${EXIT_MS}ms ease-in forwards` : `${fadeIn} 0.18s ease-out`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: closing ? 0 : 1 },
}));

/**
 * A sheet off the bottom rather than a dropdown: this is a phone screen, the
 * trigger sits in a corner, and the list has to stay reachable with one thumb
 * however many languages the app grows to.
 */
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

/** The grab handle every bottom sheet has, so it reads as one. */
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

  /** Plays the exit, then unmounts - otherwise the sheet blinks out. */
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

  /**
   * Hebrew, whatever this activity was prepared in, and whatever the
   * participant is actually reading right now. That last one matters: the
   * choice is remembered across activities, so someone who picked English
   * somewhere else and then opens a Hebrew-only activity would otherwise be
   * held in English with no way back.
   */
  const available = only
    ? LANGS.filter((l) => l.code === 'he' || l.code === lang || only.includes(l.code))
    : LANGS;

  // One language is not a choice, and a control that opens a list of one is
  // worse than no control - an activity offered in Hebrew alone, to someone
  // already reading Hebrew, shows nothing.
  if (available.length < 2) return null;

  // The language is read from storage at boot, so this has to persist and
  // reload rather than just set context state.
  const choose = (code: string) => {
    if (code === lang) {
      close();
      return;
    }
    localStorage.setItem('yooz_lang', code);
    window.location.reload();
  };

  const Trigger = variant === 'fab' ? LangFab : variant === 'darkHeader' ? DarkHeaderActionIconButton : IconButton;

  return (
    <>
      <Trigger type="button" onClick={() => setOpen(true)} aria-label="Language" aria-haspopup="menu">
        <GlobeIcon size={variant === 'fab' ? 26 : 21} />
      </Trigger>

      {/*
        Through a portal: the login screen and the journey header both create
        their own stacking contexts, and a sheet rendered inside one of them
        slid under the help button floating above it.
      */}
      {open && createPortal(
        <>
          <Scrim closing={closing} onClick={close} />
          {/* Names are written in their own language, so the list needs no translation. */}
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
