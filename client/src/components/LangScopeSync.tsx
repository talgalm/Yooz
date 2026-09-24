import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

/**
 * Keeps the language preference pointed at the right one of the three.
 *
 * The activity, the staff panels and the marketing site each store their own
 * choice, and `LanguageProvider` sits above the router - so it cannot see a
 * navigation by itself. Every switcher in the app reloads the page, which
 * settles the scope on its own; this is for the crossings that do not reload,
 * such as a staff member opening an activity from the panel.
 *
 * Renders nothing.
 */
export default function LangScopeSync() {
  const { pathname } = useLocation();
  const { useScopeOf } = useLang();

  useEffect(() => {
    useScopeOf(pathname);
  }, [pathname, useScopeOf]);

  return null;
}
