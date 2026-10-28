import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { LanguageProvider } from '../../../context/LanguageContext';
import { DEFAULT_LANG } from '../../../utils/languages';
import MarketingLayout from './MarketingLayout';
import { MARKETING_PAGES } from './marketingPages';
import { LOCALIZED_MARKETING_ROUTES, type LocalizedMarketingRoute } from './routes';
import { pageHead, withPrerenderedPage } from './pageMeta';

export { sitemapXml } from './pageMeta';
export { llmsTxt } from './llmsTxt';

export interface PrerenderedPage {
  path: string;
  file: string;
  html: string;
}

function renderPageBody(route: LocalizedMarketingRoute): string {
  const Page = MARKETING_PAGES[route.key];
  return renderToString(
    <LanguageProvider initialLang={route.lang}>
      <StaticRouter location={route.localPath}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path={route.localPath} element={<Page />} />
          </Route>
        </Routes>
      </StaticRouter>
    </LanguageProvider>,
  );
}

export function prerenderMarketingPages(shell: string): PrerenderedPage[] {
  return LOCALIZED_MARKETING_ROUTES.map((route) => ({
    path: route.localPath,
    file: route.lang === DEFAULT_LANG ? `${route.key}.html` : `${route.lang}-${route.key}.html`,
    html: withPrerenderedPage(shell, route.lang, pageHead(route, route.lang), renderPageBody(route)),
  }));
}
