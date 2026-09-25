import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { findMediaUsage } from '../utils/mediaInUse';
import { ROOT_FOLDER, MACHINE_FOLDERS, resolveFolder, isDeletableAsset } from '../utils/mediaFolders';

function cloudinaryError(err: unknown): string {
  const message = (err as { error?: { message?: string } })?.error?.message;
  return message || (err instanceof Error ? err.message : 'unknown error');
}

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const PAGE_SIZE = 60;
const CACHE_TTL_MS = 60_000;

interface MediaItem {
  publicId: string;
  url: string;
  resourceType: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
  folder?: string;
  createdAt?: string;
}

const cache = new Map<string, { items: MediaItem[]; expiresAt: number }>();

async function loadFolder(folder: string): Promise<MediaItem[]> {
  const cached = cache.get(folder);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const items: MediaItem[] = [];
  let cursor: string | undefined;
  do {
    const page: Record<string, any> = await cloudinary.api.resources_by_asset_folder(folder, {
      max_results: 500,
      ...(cursor && { next_cursor: cursor }),
    });
    for (const r of page.resources as Record<string, any>[]) {
      items.push({
        publicId: r.public_id,
        url: r.secure_url,
        resourceType: r.resource_type,
        format: r.format,
        bytes: r.bytes,
        width: r.width,
        height: r.height,
        duration: r.duration,
        fileName: r.display_name || r.filename,
        folder: r.asset_folder,
        createdAt: r.created_at,
      });
    }
    cursor = page.next_cursor;
  } while (cursor);

  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  cache.set(folder, { items, expiresAt: Date.now() + CACHE_TTL_MS });
  return items;
}

router.use(authenticateAdmin, requireRole('admin', 'super_admin'));

router.get('/', async (req: Request, res: Response) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary not configured' });
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
    console.error('[adminMedia] list failed:', cloudinaryError(err));
    res.status(502).json({ error: 'Could not read media library' });
  }
});

router.get('/folders', async (_req: Request, res: Response) => {
  try {
    const walk = async (path: string, depth: number): Promise<{ path: string; name: string; children: unknown[] }[]> => {
      const { folders } = await cloudinary.api.sub_folders(path);
      const visible = (folders as { name: string; path: string }[]).filter(
        (f) => !(path === ROOT_FOLDER && MACHINE_FOLDERS.includes(f.name)),
      );
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
    console.error('[adminMedia] folder list failed:', cloudinaryError(err));
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
    await cloudinary.api.create_folder(path);
    res.json({ success: true, path });
  } catch (err) {
    console.error('[adminMedia] create folder failed:', cloudinaryError(err));
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
    await cloudinary.api.delete_folder(path);
    cache.delete(path);
    res.json({ success: true });
  } catch (err) {
    const message = cloudinaryError(err);
    console.error('[adminMedia] delete folder failed:', message);
    res.status(409).json({ error: message.toLowerCase().includes('empty') ? 'folder_not_empty' : message });
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

  try {
    const updated: Record<string, any> = await cloudinary.api.update(publicId, { asset_folder: folder });
    cache.clear();
    res.json({ success: true, folder: updated.asset_folder, url: updated.secure_url });
  } catch (err) {
    console.error('[adminMedia] move failed:', cloudinaryError(err));
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
  const resourceType = req.query.resourceType === 'video' ? 'video' : 'image';
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
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      res.status(502).json({ error: `Cloudinary said: ${result.result}` });
      return;
    }
    cache.clear();
    res.json({ success: true });
  } catch (err) {
    console.error('[adminMedia] destroy failed:', cloudinaryError(err));
    res.status(502).json({ error: 'Delete failed' });
  }
});

export default router;
