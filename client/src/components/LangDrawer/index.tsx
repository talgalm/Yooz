import { LANGS, useLang } from '../../context/LanguageContext';
import { IconButton, DarkHeaderActionIconButton } from '../styled';

interface LangDrawerProps {
  /** Match help / exit on tinted headers (finish, leaderboard, …). */
  variant?: 'default' | 'darkHeader';
  /**
   * Languages this activity was prepared in, besides Hebrew. An activity's own
   * content is translated only for the languages it was saved with, so offering
   * more than that would hand a participant an English shell around Hebrew
   * stations. Omit to offer everything the app knows.
   */
  only?: string[];
}

export default function LangDrawer({ variant = 'default', only }: LangDrawerProps) {
  const { lang } = useLang();

  const available = only ? LANGS.filter((l) => l.code === 'he' || only.includes(l.code)) : LANGS;

  // One language is not a choice, and a button that does nothing is worse than
  // no button - an activity offered in Hebrew alone shows nothing here.
  if (available.length < 2) return null;

  const current = available.findIndex((l) => l.code === lang);
  const next = available[(current + 1) % available.length];

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
      {available[current]?.flag ?? next.flag}
    </Trigger>
  );
}
