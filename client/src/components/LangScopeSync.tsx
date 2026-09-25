import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function LangScopeSync() {
  const { pathname } = useLocation();
  const { enterScopeOf } = useLang();

  useEffect(() => {
    enterScopeOf(pathname);
  }, [pathname, enterScopeOf]);

  return null;
}
