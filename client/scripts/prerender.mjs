import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(clientDir, 'dist');
const bundleDir = path.join(distDir, '.prerender');
const pagesDir = path.join(distDir, 'prerendered');

await build({
  root: clientDir,
  logLevel: 'warn',
  build: {
    ssr: 'src/pages/marketing/shared/prerender.tsx',
    outDir: bundleDir,
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: { output: { entryFileNames: 'prerender.js' } },
  },
});

try {
  const { prerenderMarketingPages, sitemapXml, llmsTxt } = await import(pathToFileURL(path.join(bundleDir, 'prerender.js')).href);
  const shell = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const pages = prerenderMarketingPages(shell);

  fs.rmSync(pagesDir, { recursive: true, force: true });
  fs.mkdirSync(pagesDir, { recursive: true });
  for (const page of pages) fs.writeFileSync(path.join(pagesDir, page.file), page.html);
  const manifest = Object.fromEntries(pages.map((page) => [page.path, page.file]));
  fs.writeFileSync(path.join(pagesDir, 'pages.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml());
  fs.writeFileSync(path.join(distDir, 'llms.txt'), llmsTxt());

  console.log(`Prerendered ${pages.length} marketing pages: ${pages.map((page) => page.path).join(' ')}`);
} finally {
  fs.rmSync(bundleDir, { recursive: true, force: true });
}
