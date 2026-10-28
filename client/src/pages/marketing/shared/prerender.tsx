import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { LanguageProvider } from '../../../context/LanguageContext';
import { DEFAULT_LANG } from '../../../utils/languages';
import MarketingLayout from './MarketingLayout';
import { MARKETING_PAGES } from './marketingPages';
import { MARKETING_ROUTES, type MarketingRoute } from './routes';
import { pageHead, withPrerenderedPage } from './pageMeta';

export { sitemapXml } from './pageMeta';

export interface PrerenderedPage {
  path: string;
  file: string;
  html: string;
}

function renderPageBody(route: MarketingRoute): string {
  const Page = MARKETING_PAGES[route.key];
  return renderToString(
    <LanguageProvider>
      <StaticRouter location={route.path}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path={route.path} element={<Page />} />
          </Route>
        </Routes>
      </StaticRouter>
    </LanguageProvider>,
  );
}

export function prerenderMarketingPages(shell: string): PrerenderedPage[] {
  return MARKETING_ROUTES.map((route) => ({
    path: route.path,
    file: `${route.key}.html`,
    html: withPrerenderedPage(shell, pageHead(route, DEFAULT_LANG), renderPageBody(route)),
  }));
}
