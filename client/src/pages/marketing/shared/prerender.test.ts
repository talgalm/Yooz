import test, { before } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import type { PrerenderedPage } from './prerender';
import { LOCALIZED_MARKETING_ROUTES } from './routes';
import { texts as homeTexts } from '../HomePage/HomePage.i18n';
import { texts as businessTexts } from '../BusinessPage/BusinessPage.i18n';
import { texts as tourismTexts } from '../TourismPage/TourismPage.i18n';
import { texts as academyTexts } from '../AcademyPage/AcademyPage.i18n';
import { texts as aboutTexts } from '../AboutPage/AboutPage.i18n';
import { texts as metaTexts } from './PageMeta.i18n';
import { texts as navTexts } from './Nav.i18n';

const SHELL = '<!DOCTYPE html><html lang="he" dir="rtl"><head><title>Yooz</title></head><body><div id="root"></div></body></html>';

let pages: PrerenderedPage[] = [];

before(async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL('../../../../', import.meta.url)),
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const prerender = (await vite.ssrLoadModule('/src/pages/marketing/shared/prerender.tsx')) as typeof import('./prerender');
    pages = prerender.prerenderMarketingPages(SHELL);
  } finally {
    await vite.close();
  }
});

const htmlAt = (path: string) => pages.find((page) => page.path === path)?.html ?? '';

test('every marketing route is prerendered in every language, each into its own file', () => {
  assert.deepStrictEqual(pages.map((page) => page.path), LOCALIZED_MARKETING_ROUTES.map((route) => route.localPath));
  assert.ok(pages.some((page) => page.path === '/en/business'));
  assert.strictEqual(new Set(pages.map((page) => page.file)).size, pages.length);
});

test('each page carries the text a crawler should read, in its language', () => {
  for (const lang of ['he', 'en'] as const) {
    const prefix = lang === 'he' ? '' : '/en';
    assert.ok(htmlAt(prefix || '/').includes(homeTexts[lang].heroTitleTop), `${lang} home`);
    assert.ok(htmlAt(prefix || '/').includes(homeTexts[lang].faq[0].q), `${lang} home faq`);
    assert.ok(htmlAt(`${prefix}/business`).includes(businessTexts[lang].salesTitle), `${lang} business`);
    assert.ok(htmlAt(`${prefix}/tourism`).includes(tourismTexts[lang].knowledgeTitle), `${lang} tourism`);
    assert.ok(htmlAt(`${prefix}/academy`).includes(academyTexts[lang].experienceTitle), `${lang} academy`);
    assert.ok(htmlAt(`${prefix}/about`).includes(aboutTexts[lang].teamTitle), `${lang} about`);
  }
});

test('an English page is English all the way down: html, direction and links', () => {
  const html = htmlAt('/en/tourism');
  assert.ok(html.startsWith('<!DOCTYPE html><html lang="en" dir="ltr">'));
  assert.ok(html.includes('href="/en/business"'));
  assert.ok(!html.includes(navTexts.he.business));
  assert.ok(htmlAt('/tourism').includes('href="/business"'));
});

test('each page replaces the bare title with its own title and description', () => {
  for (const route of LOCALIZED_MARKETING_ROUTES) {
    const html = htmlAt(route.localPath);
    const { title, description } = metaTexts[route.lang]![route.key]!;
    assert.ok(html.includes(`<title>${title}</title>`), route.localPath);
    assert.ok(html.includes(`<meta name="description" content="${description}" />`), route.localPath);
    assert.ok(!html.includes('<title>Yooz</title>'), route.localPath);
    assert.ok(!html.includes('<div id="root"></div>'), route.localPath);
  }
});
