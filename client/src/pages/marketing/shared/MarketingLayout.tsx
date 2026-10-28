import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLang } from '../../../context/LanguageContext';
import Nav from './Nav';
import Footer from './Footer';
import { Page } from './styled';
import useMarketingTitle from './useMarketingTitle';

export default function MarketingLayout() {
  const { dir } = useLang();
  const { pathname, hash } = useLocation();
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
