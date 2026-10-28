import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGS } from '../../../utils/languages';
import { MARKETING_ROUTES } from './routes';
import { SITE_ORIGIN, marketingRouteAt, pageHead, pageMeta, pageUrl, sitemapXml, withPrerenderedPage } from './pageMeta';
import { llmsTxt } from './llmsTxt';
import { pageFaq } from './pageFaq';

const SHELL = '<html lang="he" dir="rtl"><head>\n    <title>Yooz</title>\n</head><body><div id="root"></div></body></html>';

function jsonLd(head: string) {
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(head)?.[1] ?? '{}';
  return JSON.parse(json) as { '@graph': { '@type': string; mainEntity?: unknown[] }[] };
}

test('every page has a title and a description Google will show whole, in every language', () => {
  for (const { code } of LANGS) {
    for (const route of MARKETING_ROUTES) {
      const { title, description } = pageMeta(route, code);
      assert.ok(title.length >= 20 && title.length <= 60, `${code} ${route.key} title is ${title.length} chars`);
      assert.ok(description.length >= 100 && description.length <= 160, `${code} ${route.key} description is ${description.length} chars`);
    }
  }
});

test('a prefixed address is still the same marketing page', () => {
  assert.equal(marketingRouteAt('/en')?.key, 'home');
  assert.equal(marketingRouteAt('/en/business')?.key, 'business');
  assert.equal(marketingRouteAt('/business')?.key, 'business');
  assert.equal(marketingRouteAt('/privacy'), undefined);
});

test('each language version is canonical to itself and names the other as its alternate', () => {
  const business = marketingRouteAt('/business')!;
  const he = pageHead(business, 'he');
  const en = pageHead(business, 'en');
  assert.ok(he.includes(`<link rel="canonical" href="${SITE_ORIGIN}/business" />`));
  assert.ok(en.includes(`<link rel="canonical" href="${SITE_ORIGIN}/en/business" />`));
  for (const head of [he, en]) {
    assert.ok(head.includes(`<link rel="alternate" hreflang="he" href="${SITE_ORIGIN}/business" />`));
    assert.ok(head.includes(`<link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/business" />`));
    assert.ok(head.includes(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/business" />`));
  }
  assert.ok(he.includes('<meta property="og:locale" content="he_IL" />'));
  assert.ok(en.includes('<meta property="og:locale" content="en_US" />'));
});

test('structured data describes the company everywhere and each page for what it is', () => {
  const types = (path: string) => jsonLd(pageHead(marketingRouteAt(path)!, 'he'))['@graph'].map((node) => node['@type']);
  assert.deepEqual(types('/'), ['Organization', 'WebSite', 'FAQPage']);
  assert.deepEqual(types('/business'), ['Organization', 'Service', 'FAQPage']);
  assert.deepEqual(types('/about'), ['Organization', 'AboutPage']);
  const faq = jsonLd(pageHead(marketingRouteAt('/tourism')!, 'en'))['@graph'].find((node) => node['@type'] === 'FAQPage');
  assert.equal(faq?.mainEntity?.length, pageFaq('tourism', 'en').length);
});

test('the prerendered body lands in #root, in the page language and direction', () => {
  const html = withPrerenderedPage(SHELL, 'en', '<title>Page</title>', '<main>costs $& and $1</main>');
  assert.equal(html, '<html lang="en" dir="ltr"><head>\n    <title>Page</title>\n</head><body><div id="root"><main>costs $& and $1</main></div></body></html>');
});

test('a shell without the expected markers fails the build instead of shipping an empty page', () => {
  assert.throws(() => withPrerenderedPage('<html><body><div id="root"></div></body></html>', 'he', '', ''));
  assert.throws(() => withPrerenderedPage('<html><title>Yooz</title><div id="app"></div></html>', 'he', '', ''));
});

test('the sitemap lists every page in every language once, with its alternates', () => {
  const xml = sitemapXml();
  for (const route of MARKETING_ROUTES) {
    for (const path of [route.path, route.path === '/' ? '/en' : `/en${route.path}`]) {
      assert.equal(xml.split(`<loc>${SITE_ORIGIN}${path}</loc>`).length, 2, path);
    }
  }
  assert.equal(xml.split('<url>').length - 1, MARKETING_ROUTES.length * LANGS.length);
});

test('llms.txt links every page in every language and carries the FAQ', () => {
  const text = llmsTxt();
  assert.ok(text.startsWith('# Yooz\n'));
  for (const route of MARKETING_ROUTES) {
    for (const { code } of LANGS) {
      assert.ok(text.includes(`](${pageUrl(route, code)})`), `${code} ${route.path}`);
    }
  }
  assert.ok(text.includes(pageFaq('business', 'en')[0].q));
  assert.ok(text.includes(pageFaq('academy', 'he')[0].a));
});
