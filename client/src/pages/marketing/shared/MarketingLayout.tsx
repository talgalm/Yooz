import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLang } from '../../../context/LanguageContext';
import Nav from './Nav';
import Footer from './Footer';
import { Page } from './styled';

/**
 * Chrome shared by every marketing page: sticky nav, routed body, footer.
 *
 * Also owns two behaviours React Router leaves to the app:
 *  - smooth scrolling for the in-page `#contact` and `#faq` anchors, scoped to
 *    the marketing site so participant screens keep their instant jumps;
 *  - resetting scroll on navigation between pages, but never on an anchor jump,
 *    which would otherwise fight the smooth scroll it just triggered.
 */
export default function MarketingLayout() {
  const { dir } = useLang();
  const { pathname, hash } = useLocation();

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
