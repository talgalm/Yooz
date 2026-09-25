import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

/**
 * Keeps the language preference pointed at the right one of the three, since
 * `LanguageProvider` sits above the router and cannot see a navigation itself.
 * Every switcher reloads the page anyway; this is for the crossings that do
 * not, such as opening an activity from the staff panel. Renders nothing.
 */
export default function LangScopeSync() {
  const { pathname } = useLocation();
  const { useScopeOf } = useLang();

  useEffect(() => {
    useScopeOf(pathname);
  }, [pathname, useScopeOf]);

  return null;
}
