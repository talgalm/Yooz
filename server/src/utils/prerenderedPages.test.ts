import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Request, Response } from 'express';
import { loadPrerenderedPages, servePrerenderedPages } from './prerenderedPages';

function buildDir(manifest: Record<string, string> | null, files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yooz-prerendered-'));
  const pagesDir = path.join(dir, 'prerendered');
  fs.mkdirSync(pagesDir);
  for (const file of files) fs.writeFileSync(path.join(pagesDir, file), '<html></html>');
  if (manifest) fs.writeFileSync(path.join(pagesDir, 'pages.json'), JSON.stringify(manifest));
  return dir;
}

test('a build with no prerendered pages serves nothing extra', () => {
  assert.equal(loadPrerenderedPages(buildDir(null, [])).size, 0);
  assert.equal(loadPrerenderedPages(path.join(os.tmpdir(), 'yooz-no-such-build')).size, 0);
});

test('each route maps to its file, and a listed file that is missing is skipped', () => {
  const dir = buildDir({ '/': 'home.html', '/business': 'business.html', '/about': 'about.html' }, ['home.html', 'business.html']);
  const pages = loadPrerenderedPages(dir);
  assert.deepEqual([...pages.keys()], ['/', '/business']);
  assert.equal(pages.get('/'), path.join(dir, 'prerendered', 'home.html'));
});

test('a manifest entry cannot point outside the prerendered folder', () => {
  const dir = buildDir({ '/': '../../secret.html' }, ['secret.html']);
  assert.equal(loadPrerenderedPages(dir).get('/'), path.join(dir, 'prerendered', 'secret.html'));
});

test('only an exact GET or HEAD of a prerendered route is answered', () => {
  const handler = servePrerenderedPages(buildDir({ '/business': 'business.html' }, ['business.html']));
  const sent: string[] = [];
  let passed = 0;
  const res = { sendFile: (file: string) => { sent.push(path.basename(file)); } } as unknown as Response;
  const call = (method: string, reqPath: string) => handler({ method, path: reqPath } as Request, res, () => { passed += 1; });

  call('GET', '/business');
  call('HEAD', '/business');
  call('GET', '/business/');
  call('GET', '/play/abc123');
  call('POST', '/business');

  assert.deepEqual(sent, ['business.html', 'business.html']);
  assert.equal(passed, 3);
});
