import { LANGS, useLang } from '../../context/LanguageContext';
import { IconButton, DarkHeaderActionIconButton } from '../styled';

interface LangDrawerProps {
  /** Match help / exit on tinted headers (finish, leaderboard, …). */
  variant?: 'default' | 'darkHeader';
}

export default function LangDrawer({ variant = 'default' }: LangDrawerProps) {
  const { lang } = useLang();

  const current = LANGS.findIndex((l) => l.code === lang);
  const next = LANGS[(current + 1) % LANGS.length];

  // ponytail: cycles to the next language on tap — fine at two or three, swap
  // for a menu once LANGS grows past that.
  // The language is read from storage at boot, so this has to persist and
  // reload rather than just set context state.
  const cycle = () => {
    localStorage.setItem('yooz_lang', next.code);
    window.location.reload();
  };

  const Trigger = variant === 'darkHeader' ? DarkHeaderActionIconButton : IconButton;

  return (
    <Trigger type="button" onClick={cycle} aria-label={`Switch to ${next.label}`}>
      {LANGS[current]?.flag ?? next.flag}
    </Trigger>
  );
}
