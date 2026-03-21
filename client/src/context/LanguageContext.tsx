import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'en' | 'he';

interface LanguageContextType {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('yooz_lang') as Lang) || 'he';
  });

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem('yooz_lang', lang);
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

/**
 * Hook to get translations for a component.
 * Pass an object like `{ en: { ... }, he: { ... } }` and it returns the active language's texts.
 *
 * Usage:
 *   import { texts } from './MyComponent.i18n';
 *   const t = useTranslations(texts);
 */
export function useTranslations<T>(texts: Record<Lang, T>): T {
  const { lang } = useLang();
  return texts[lang];
}
