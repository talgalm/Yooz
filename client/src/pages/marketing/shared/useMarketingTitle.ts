import { useEffect } from 'react';
import { useLang } from '../../../context/LanguageContext';
import { SITE_NAME, marketingRouteAt, pageMeta } from './pageMeta';

export default function useMarketingTitle(pathname: string) {
  const { lang } = useLang();

  useEffect(() => {
    const route = marketingRouteAt(pathname);
    if (!route) return;
    document.title = pageMeta(route, lang).title;
    return () => { document.title = SITE_NAME; };
  }, [pathname, lang]);
}
