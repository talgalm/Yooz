import { useLang } from '../../context/LanguageContext';
import { IconButton, DarkHeaderActionIconButton } from '../styled';

interface LangDrawerProps {
  /** Match help / exit on tinted headers (finish, leaderboard, …). */
  variant?: 'default' | 'darkHeader';
}

export default function LangDrawer({ variant = 'default' }: LangDrawerProps) {
  const { lang, setLang } = useLang();

  const toggle = () => {
    localStorage.setItem('yooz_lang', lang === 'he' ? 'en' : 'he');
    window.location.reload();
  };
  const flag = lang === 'he' ? '🇮🇱' : '🇺🇸';
  const Trigger = variant === 'darkHeader' ? DarkHeaderActionIconButton : IconButton;

  return (
    <Trigger type="button" onClick={toggle} aria-label="Change language">
      {flag}
    </Trigger>
  );
}
