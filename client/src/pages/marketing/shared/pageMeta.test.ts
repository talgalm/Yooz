import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGS } from '../../../utils/languages';
import { MARKETING_ROUTES } from './routes';
import { SITE_ORIGIN, marketingRouteAt, pageHead, pageMeta, sitemapXml, withPrerenderedPage } from './pageMeta';

const SHELL = '<html><head>\n    <title>Yooz</title>\n</head><body><div id="root"></div></body></html>';

test('every page has a title and a description Google will show whole, in every language', () => {
  for (const { code } of LANGS) {
    for (const route of MARKETING_ROUTES) {
      const { title, description } = pageMeta(route, code);
      assert.ok(title.length >= 20 && title.length <= 60, `${code} ${route.key} title is ${title.length} chars`);
      assert.ok(description.length >= 100 && description.length <= 160, `${code} ${route.key} description is ${description.length} chars`);
    }
  }
});

test('the head points crawlers at the canonical address of the page', () => {
  const business = marketingRouteAt('/business')!;
  const head = pageHead(business, 'he');
  assert.ok(head.includes(`<link rel="canonical" href="${SITE_ORIGIN}/business" />`));
  assert.ok(head.includes('<meta property="og:locale" content="he_IL" />'));
  assert.ok(!head.includes('application/ld+json'));
  assert.ok(pageHead(marketingRouteAt('/')!, 'he').includes('"@type":"Organization"'));
});

test('the prerendered body lands in #root and the head replaces the bare title', () => {
  const html = withPrerenderedPage(SHELL, '<title>Page</title>', '<main>costs $& and $1</main>');
  assert.equal(html, '<html><head>\n    <title>Page</title>\n</head><body><div id="root"><main>costs $& and $1</main></div></body></html>');
});

test('a shell without the expected markers fails the build instead of shipping an empty page', () => {
  assert.throws(() => withPrerenderedPage('<html><body><div id="root"></div></body></html>', '', ''));
  assert.throws(() => withPrerenderedPage('<title>Yooz</title><div id="app"></div>', '', ''));
});

test('the sitemap lists every marketing page once', () => {
  const xml = sitemapXml();
  for (const route of MARKETING_ROUTES) {
    assert.equal(xml.split(`<loc>${SITE_ORIGIN}${route.path}</loc>`).length, 2, route.path);
  }
});
