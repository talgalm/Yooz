import test, { before } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import type { PrerenderedPage } from './prerender';
import { MARKETING_ROUTES } from './routes';
import { texts as homeTexts } from '../HomePage/HomePage.i18n';
import { texts as businessTexts } from '../BusinessPage/BusinessPage.i18n';
import { texts as tourismTexts } from '../TourismPage/TourismPage.i18n';
import { texts as academyTexts } from '../AcademyPage/AcademyPage.i18n';
import { texts as aboutTexts } from '../AboutPage/AboutPage.i18n';
import { texts as metaTexts } from './PageMeta.i18n';

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

test('every marketing route is prerendered into its own file', () => {
  assert.deepStrictEqual(pages.map((page) => page.path), MARKETING_ROUTES.map((route) => route.path));
  assert.strictEqual(new Set(pages.map((page) => page.file)).size, pages.length);
});

test('each page carries the text a crawler should read, in Hebrew', () => {
  assert.ok(htmlAt('/').includes(homeTexts.he.heroTitleTop));
  assert.ok(htmlAt('/').includes(homeTexts.he.faq[0].q));
  assert.ok(htmlAt('/business').includes(businessTexts.he.salesTitle));
  assert.ok(htmlAt('/tourism').includes(tourismTexts.he.knowledgeTitle));
  assert.ok(htmlAt('/academy').includes(academyTexts.he.experienceTitle));
  assert.ok(htmlAt('/about').includes(aboutTexts.he.teamTitle));
});

test('each page replaces the bare title with its own title and description', () => {
  for (const route of MARKETING_ROUTES) {
    const html = htmlAt(route.path);
    const { title, description } = metaTexts.he[route.key];
    assert.ok(html.includes(`<title>${title}</title>`), route.path);
    assert.ok(html.includes(`<meta name="description" content="${description}" />`), route.path);
    assert.ok(!html.includes('<title>Yooz</title>'), route.path);
    assert.ok(!html.includes('<div id="root"></div>'), route.path);
  }
});
