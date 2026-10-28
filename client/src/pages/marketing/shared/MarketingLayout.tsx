import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { DEFAULT_LANG, useLang } from '../../../context/LanguageContext';
import { langPrefixOf, localizedPath } from '../../../utils/currentLang';
import Nav from './Nav';
import Footer from './Footer';
import { Page } from './styled';
import useMarketingTitle from './useMarketingTitle';

export default function MarketingLayout() {
  const { dir, lang } = useLang();
  const { pathname, search, hash } = useLocation();
  useMarketingTitle(pathname);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    return () => { root.style.scrollBehavior = previous; };
  }, []);

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  if ((langPrefixOf(pathname) ?? DEFAULT_LANG) !== lang) {
    return <Navigate to={localizedPath(pathname, lang) + search + hash} replace />;
  }

  return (
    <Page dir={dir}>
      <Nav />
      <main>
        <Outlet />
      </main>
      <Footer />
    </Page>
  );
}
