import { translate } from '../../../context/LanguageContext';
import { languageOf, type Lang } from '../../../utils/languages';
import { MARKETING_ROUTES, type MarketingRoute } from './routes';
import { texts, type PageMetaText } from './PageMeta.i18n';

export const SITE_ORIGIN = 'https://www.yooz.org.il';
export const SITE_NAME = 'Yooz';
const LOGO_PATH = '/images/marketing/logo-yooz.png';

const SHARE_IMAGES: Record<MarketingRoute['key'], string> = {
  home: '/images/marketing/hero-home.png',
  business: '/images/marketing/sector-business.jpg',
  tourism: '/images/marketing/hero-tourism.jpg',
  academy: '/images/marketing/hero-academy.jpg',
  about: '/images/marketing/hero-home.png',
};

const TITLE_TAG = /<title>[^<]*<\/title>/;
const EMPTY_ROOT = '<div id="root"></div>';

export function marketingRouteAt(pathname: string): MarketingRoute | undefined {
  return MARKETING_ROUTES.find((route) => route.path === pathname);
}

export function pageMeta(route: MarketingRoute, lang: Lang): PageMetaText {
  return translate(texts, lang)[route.key];
}

export function pageUrl(route: MarketingRoute): string {
  return SITE_ORIGIN + route.path;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function siteStructuredData(): string {
  const home = `${SITE_ORIGIN}/`;
  const graph = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: home },
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: home, logo: SITE_ORIGIN + LOGO_PATH },
  ];
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
}

export function pageHead(route: MarketingRoute, lang: Lang): string {
  const { title, description } = pageMeta(route, lang);
  const url = pageUrl(route);
  const image = SITE_ORIGIN + SHARE_IMAGES[route.key];
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${languageOf(lang).locale.replace('-', '_')}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (route.key === 'home') tags.push(siteStructuredData());
  return tags.join('\n    ');
}

export function withPrerenderedPage(shell: string, head: string, body: string): string {
  if (!TITLE_TAG.test(shell) || !shell.includes(EMPTY_ROOT)) {
    throw new Error('index.html needs a <title> and an empty <div id="root"></div> to prerender into');
  }
  return shell
    .replace(TITLE_TAG, () => head)
    .replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`);
}

export function sitemapXml(): string {
  const urls = MARKETING_ROUTES.map((route) => `  <url><loc>${pageUrl(route)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
