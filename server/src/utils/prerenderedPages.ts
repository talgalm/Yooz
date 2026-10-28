import fs from 'fs';
import path from 'path';
import type { RequestHandler } from 'express';

export function loadPrerenderedPages(clientBuildPath: string): Map<string, string> {
  const pagesDir = path.join(clientBuildPath, 'prerendered');
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(pagesDir, 'pages.json'), 'utf8')) as Record<string, string>;
    return new Map(
      Object.entries(manifest)
        .map(([route, file]) => [route, path.join(pagesDir, path.basename(file))] as const)
        .filter(([, file]) => fs.existsSync(file)),
    );
  } catch {
    return new Map();
  }
}

export function servePrerenderedPages(clientBuildPath: string): RequestHandler {
  const pages = loadPrerenderedPages(clientBuildPath);
  return (req, res, next) => {
    const file = req.method === 'GET' || req.method === 'HEAD' ? pages.get(req.path) : undefined;
    if (file) res.sendFile(file);
    else next();
  };
}
