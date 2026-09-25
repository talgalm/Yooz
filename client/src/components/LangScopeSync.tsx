import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function LangScopeSync() {
  const { pathname } = useLocation();
  const { useScopeOf } = useLang();

  useEffect(() => {
    useScopeOf(pathname);
  }, [pathname, useScopeOf]);

  return null;
}
