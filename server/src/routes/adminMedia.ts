import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { findMediaUsage } from '../utils/mediaInUse';
import { ROOT_FOLDER, MACHINE_FOLDERS, resolveFolder, isDeletableAsset } from '../utils/mediaFolders';
import { extensionOf, posterKeyOf, publicIdOf, resourceTypeOf } from '../utils/mediaKeys';
import {
  createFolder,
  deleteFolderIfEmpty,
  deleteMediaByPublicId,
  isFolderMarker,
  isMediaConfigured,
  listObjects,
  mediaUrl,
  moveMediaByPublicId,
} from '../services/mediaStore';

const router = Router();

const PAGE_SIZE = 60;
const CACHE_TTL_MS = 60_000;

interface MediaItem {
  publicId: string;
  url: string;
  resourceType: string;
  format?: string;
  bytes?: number;
  fileName?: string;
  folder?: string;
  createdAt?: string;
}

const cache = new Map<string, { items: MediaItem[]; expiresAt: number }>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

async function loadFolder(folder: string): Promise<MediaItem[]> {
  const cached = cache.get(folder);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const { objects } = await listObjects(`${folder}/`, '/');
  const keys = objects.map((o) => o.key).filter((key) => !isFolderMarker(key));
  const posters = new Set(keys.filter((key) => resourceTypeOf(key) === 'video').map(posterKeyOf));
  const items: MediaItem[] = objects
    .filter((o) => !isFolderMarker(o.key) && !posters.has(o.key))
    .map((o) => ({
      publicId: publicIdOf(o.key),
      url: mediaUrl(o.key),
      resourceType: resourceTypeOf(o.key),
      format: extensionOf(o.key),
      bytes: o.bytes,
      fileName: o.key.slice(o.key.lastIndexOf('/') + 1),
      folder,
      createdAt: o.lastModified?.toISOString(),
    }));

  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  cache.set(folder, { items, expiresAt: Date.now() + CACHE_TTL_MS });
  return items;
}

router.use(authenticateAdmin, requireRole('admin', 'super_admin'));

router.get('/', async (req: Request, res: Response) => {
  if (!isMediaConfigured()) {
    res.status(500).json({ error: 'Media storage not configured' });
    return;
  }

  const folder = resolveFolder(req.query.folder);
  if (!folder) {
    res.status(400).json({ error: 'Invalid folder' });
    return;
  }

  const type = req.query.type === 'image' || req.query.type === 'video' ? req.query.type : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const offset = Math.max(0, Number(req.query.offset) || 0);

  try {
    const all = await loadFolder(folder);
    const filtered = all.filter((item) => {
      if (type && item.resourceType !== type) return false;
      if (q && !`${item.publicId} ${item.fileName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    res.json({
      folder,
      items: filtered.slice(offset, offset + PAGE_SIZE),
      nextOffset: offset + PAGE_SIZE < filtered.length ? offset + PAGE_SIZE : null,
      total: filtered.length,
    });
  } catch (err) {
    console.error('[adminMedia] list failed:', errorMessage(err));
    res.status(502).json({ error: 'Could not read media library' });
  }
});

router.get('/folders', async (_req: Request, res: Response) => {
  try {
    const walk = async (path: string, depth: number): Promise<{ path: string; name: string; children: unknown[] }[]> => {
      const { folders } = await listObjects(`${path}/`, '/');
      const visible = folders
        .map((prefix) => prefix.replace(/\/$/, ''))
        .map((childPath) => ({ path: childPath, name: childPath.slice(childPath.lastIndexOf('/') + 1) }))
        .filter((f) => !(path === ROOT_FOLDER && MACHINE_FOLDERS.includes(f.name)));
      return Promise.all(
        visible.map(async (f) => ({
          path: f.path,
          name: f.name,
          children: depth > 0 ? await walk(f.path, depth - 1) : [],
        })),
      );
    };
    res.json({ root: ROOT_FOLDER, folders: await walk(ROOT_FOLDER, 2) });
  } catch (err) {
    console.error('[adminMedia] folder list failed:', errorMessage(err));
    res.status(502).json({ error: 'Could not read folders' });
  }
});

router.post('/folders', async (req: Request, res: Response) => {
  const parent = resolveFolder(req.body?.parent);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!parent) {
    res.status(400).json({ error: 'Invalid parent folder' });
    return;
  }
  if (!name || name.length > 40 || /[/\\]/.test(name)) {
    res.status(400).json({ error: 'Invalid folder name' });
    return;
  }
  const path = resolveFolder(`${parent}/${name}`);
  if (!path) {
    res.status(400).json({ error: 'Invalid folder name' });
    return;
  }

  try {
    await createFolder(path);
    res.json({ success: true, path });
  } catch (err) {
    console.error('[adminMedia] create folder failed:', errorMessage(err));
    res.status(502).json({ error: 'Could not create folder' });
  }
});

router.delete('/folders', async (req: Request, res: Response) => {
  const path = resolveFolder(req.query.folder);
  if (!path || path === ROOT_FOLDER) {
    res.status(400).json({ error: 'Invalid folder' });
    return;
  }
  try {
    if (!(await deleteFolderIfEmpty(path))) {
      res.status(409).json({ error: 'folder_not_empty' });
      return;
    }
    cache.delete(path);
    res.json({ success: true });
  } catch (err) {
    console.error('[adminMedia] delete folder failed:', errorMessage(err));
    res.status(502).json({ error: 'Could not delete folder' });
  }
});

router.patch('/move', async (req: Request, res: Response) => {
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
  const folder = resolveFolder(req.body?.folder);

  if (!publicId || !isDeletableAsset(publicId)) {
    res.status(403).json({ error: 'Only admin-uploaded media can be moved' });
    return;
  }
  if (!folder) {
    res.status(400).json({ error: 'Invalid folder' });
    return;
  }

  const usage = await findMediaUsage(publicId);
  if (usage.length > 0) {
    res.status(409).json({ error: 'This file is in use, so moving it would break its links', usage });
    return;
  }

  try {
    const moved = await moveMediaByPublicId(publicId, folder);
    const main = moved.find((key) => !moved.some((other) => other !== key && posterKeyOf(other) === key));
    cache.clear();
    res.json({ success: true, folder, url: main ? mediaUrl(main) : undefined });
  } catch (err) {
    console.error('[adminMedia] move failed:', errorMessage(err));
    res.status(502).json({ error: 'Move failed' });
  }
});

router.get('/usage', async (req: Request, res: Response) => {
  const publicId = typeof req.query.publicId === 'string' ? req.query.publicId : '';
  if (!publicId) {
    res.status(400).json({ error: 'publicId is required' });
    return;
  }
  res.json({ usage: await findMediaUsage(publicId) });
});

router.delete('/', async (req: Request, res: Response) => {
  const publicId = typeof req.query.publicId === 'string' ? req.query.publicId : '';
  const force = req.query.force === 'true';

  if (!publicId) {
    res.status(400).json({ error: 'publicId is required' });
    return;
  }
  if (!isDeletableAsset(publicId)) {
    res.status(403).json({ error: 'Only admin-uploaded media can be deleted here' });
    return;
  }

  if (!force) {
    const usage = await findMediaUsage(publicId);
    if (usage.length > 0) {
      res.status(409).json({ error: 'in_use', usage });
      return;
    }
  }

  try {
    await deleteMediaByPublicId(publicId);
    cache.clear();
    res.json({ success: true });
  } catch (err) {
    console.error('[adminMedia] destroy failed:', errorMessage(err));
    res.status(502).json({ error: 'Delete failed' });
  }
});

export default router;
