import { useState } from 'react';
import { useLang, Lang } from '../../context/LanguageContext';
import { IconButton, DarkHeaderActionIconButton } from '../styled';
import {
  Backdrop,
  DrawerPanel,
  DrawerHandle,
  OptionList,
  OptionButton,
  OptionFlag,
  OptionLabel,
  OptionCheck,
} from './LangDrawer.styles';

const languages: { code: Lang; label: string; flag: string }[] = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

interface LangDrawerProps {
  /** Match help / exit on tinted headers (finish, leaderboard, …). */
  variant?: 'default' | 'darkHeader';
}

export default function LangDrawer({ variant = 'default' }: LangDrawerProps) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  const Trigger = variant === 'darkHeader' ? DarkHeaderActionIconButton : IconButton;

  return (
    <>
      <Trigger type="button" onClick={() => setOpen(true)} aria-label="Change language">
        {languages.find((l) => l.code === lang)?.flag}
      </Trigger>

      {open && (
        <Backdrop onClick={() => setOpen(false)}>
          <DrawerPanel onClick={(e) => e.stopPropagation()}>
            <DrawerHandle />
            <OptionList>
              {languages.map((l) => (
                <li key={l.code}>
                  <OptionButton
                    active={lang === l.code}
                    onClick={() => handleSelect(l.code)}
                  >
                    <OptionFlag>{l.flag}</OptionFlag>
                    <OptionLabel>{l.label}</OptionLabel>
                    {lang === l.code && <OptionCheck>✓</OptionCheck>}
                  </OptionButton>
                </li>
              ))}
            </OptionList>
          </DrawerPanel>
        </Backdrop>
      )}
    </>
  );
}
