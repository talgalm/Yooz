import { translate } from '../../../context/LanguageContext';
import { DEFAULT_LANG, LANGS, languageOf, type Lang } from '../../../utils/languages';
import { localizedPath, withoutLangPrefix } from '../../../utils/currentLang';
import { MARKETING_ROUTES, type MarketingRoute } from './routes';
import { texts, type PageMetaText } from './PageMeta.i18n';
import { texts as footerTexts } from './Footer.i18n';
import { texts as aboutTexts } from '../AboutPage/AboutPage.i18n';
import { pageFaq } from './pageFaq';
import { CONTACT_EMAIL, CONTACT_PHONE_INTERNATIONAL } from './contact';

export const SITE_ORIGIN = 'https://www.yooz.org.il';
export const SITE_NAME = 'Yooz';
const LOGO_PATH = '/images/marketing/logo-yooz.png';
const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const COUNTRY_SERVED = 'IL';

const SHARE_IMAGES: Record<MarketingRoute['key'], string> = {
  home: '/images/marketing/hero-home.png',
  business: '/images/marketing/sector-business.jpg',
  tourism: '/images/marketing/hero-tourism.jpg',
  academy: '/images/marketing/hero-academy.jpg',
  about: '/images/marketing/hero-home.png',
};

const HTML_TAG = /<html[^>]*>/;
const TITLE_TAG = /<title>[^<]*<\/title>/;
const EMPTY_ROOT = '<div id="root"></div>';

export function marketingRouteAt(pathname: string): MarketingRoute | undefined {
  const base = withoutLangPrefix(pathname);
  return MARKETING_ROUTES.find((route) => route.path === base);
}

export function pageMeta(route: MarketingRoute, lang: Lang): PageMetaText {
  return translate(texts, lang)[route.key];
}

export function pageUrl(route: MarketingRoute, lang: Lang): string {
  return SITE_ORIGIN + localizedPath(route.path, lang);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ogLocale(lang: Lang): string {
  return languageOf(lang).locale.replace('-', '_');
}

function organization(lang: Lang) {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: SITE_ORIGIN + LOGO_PATH,
    slogan: translate(footerTexts, lang).tagline,
    description: translate(texts, lang).home.description,
    founder: { '@type': 'Person', name: translate(aboutTexts, lang).founderName },
    areaServed: COUNTRY_SERVED,
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE_INTERNATIONAL,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE_INTERNATIONAL,
      areaServed: COUNTRY_SERVED,
      availableLanguage: LANGS.map((l) => l.locale),
    },
  };
}

function pageNode(route: MarketingRoute, lang: Lang) {
  const { title, description } = pageMeta(route, lang);
  const url = pageUrl(route, lang);
  if (route.key === 'home') {
    return {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`,
      inLanguage: LANGS.map((l) => l.locale),
      publisher: { '@id': ORGANIZATION_ID },
    };
  }
  if (route.key === 'about') {
    return { '@type': 'AboutPage', url, name: title, description, inLanguage: languageOf(lang).locale, mainEntity: { '@id': ORGANIZATION_ID } };
  }
  return { '@type': 'Service', url, name: title, description, serviceType: 'Gamification', provider: { '@id': ORGANIZATION_ID }, areaServed: COUNTRY_SERVED };
}

function faqNode(route: MarketingRoute, lang: Lang) {
  const faq = pageFaq(route.key, lang);
  if (!faq.length) return null;
  return {
    '@type': 'FAQPage',
    url: pageUrl(route, lang),
    inLanguage: languageOf(lang).locale,
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

function structuredData(route: MarketingRoute, lang: Lang): string {
  const graph = [organization(lang), pageNode(route, lang), faqNode(route, lang)].filter(Boolean);
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`;
}

export function pageHead(route: MarketingRoute, lang: Lang): string {
  const { title, description } = pageMeta(route, lang);
  const url = pageUrl(route, lang);
  const image = SITE_ORIGIN + SHARE_IMAGES[route.key];
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...LANGS.map(({ code }) => `<link rel="alternate" hreflang="${code}" href="${pageUrl(route, code)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(route, DEFAULT_LANG)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${ogLocale(lang)}" />`,
    ...LANGS.filter(({ code }) => code !== lang).map(({ code }) => `<meta property="og:locale:alternate" content="${ogLocale(code)}" />`),
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    structuredData(route, lang),
  ];
  return tags.join('\n    ');
}

export function withPrerenderedPage(shell: string, lang: Lang, head: string, body: string): string {
  if (!HTML_TAG.test(shell) || !TITLE_TAG.test(shell) || !shell.includes(EMPTY_ROOT)) {
    throw new Error('index.html needs <html>, a <title> and an empty <div id="root"></div> to prerender into');
  }
  const { code, dir } = languageOf(lang);
  return shell
    .replace(HTML_TAG, () => `<html lang="${code}" dir="${dir}">`)
    .replace(TITLE_TAG, () => head)
    .replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`);
}

export function sitemapXml(): string {
  const entries = MARKETING_ROUTES.flatMap((route) => {
    const alternates = [
      ...LANGS.map(({ code }) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${pageUrl(route, code)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(route, DEFAULT_LANG)}"/>`,
    ].join('\n');
    return LANGS.map(({ code }) => `  <url>\n    <loc>${pageUrl(route, code)}</loc>\n${alternates}\n  </url>`);
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
