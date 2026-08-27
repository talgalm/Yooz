import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { findMediaUsage } from '../utils/mediaInUse';

/**
 * Cloudinary rejections carry `request_options.auth` — the API key and secret
 * in plain text. Log the message, never the object.
 */
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

// Admin uploads only. The rest of the cloud is machine output — participant
// selfies (yooz/collage-inputs), generated collages, tutorial videos — which
// nobody should be able to delete from a media browser.
const ADMIN_UPLOAD_FOLDER = 'yooz';
const PAGE_SIZE = 60;
const HARD_CAP = 2000;
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
  createdAt?: string;
}

let cache: { items: MediaItem[]; expiresAt: number } | null = null;

/**
 * Every admin upload, newest first.
 *
 * One fetch for the whole folder rather than a query per page: there are ~425
 * of them, Cloudinary returns 500 per call, and the Admin API allows only 500
 * calls an hour — a page-per-scroll would burn that. It also means filtering
 * and search happen here, on plain strings, instead of in Cloudinary's query
 * language, which has no substring match and no user input reaching it.
 */
async function loadAdminMedia(): Promise<MediaItem[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.items;

  const items: MediaItem[] = [];
  let cursor: string | undefined;
  do {
    let search = cloudinary.search
      .expression(`folder="${ADMIN_UPLOAD_FOLDER}" AND (resource_type:image OR resource_type:video)`)
      .sort_by('created_at', 'desc')
      .max_results(500);
    if (cursor) search = search.next_cursor(cursor);
    const page = await search.execute();
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
        fileName: r.filename,
        createdAt: r.created_at,
      });
    }
    cursor = page.next_cursor;
  } while (cursor && items.length < HARD_CAP);

  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}

router.use(authenticateAdmin, requireRole('admin', 'super_admin'));

// Browse admin-uploaded media (newest first, offset-paged)
router.get('/', async (req: Request, res: Response) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary not configured' });
    return;
  }

  const type = req.query.type === 'image' || req.query.type === 'video' ? req.query.type : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const offset = Math.max(0, Number(req.query.offset) || 0);

  try {
    const all = await loadAdminMedia();
    const filtered = all.filter((item) => {
      if (type && item.resourceType !== type) return false;
      if (q && !`${item.publicId} ${item.fileName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    res.json({
      items: filtered.slice(offset, offset + PAGE_SIZE),
      nextOffset: offset + PAGE_SIZE < filtered.length ? offset + PAGE_SIZE : null,
      total: filtered.length,
    });
  } catch (err) {
    console.error('[adminMedia] search failed:', cloudinaryError(err));
    res.status(502).json({ error: 'Could not read media library' });
  }
});

// What still references this asset (drives the delete warning)
router.get('/usage', async (req: Request, res: Response) => {
  const publicId = typeof req.query.publicId === 'string' ? req.query.publicId : '';
  if (!publicId) {
    res.status(400).json({ error: 'publicId is required' });
    return;
  }
  res.json({ usage: await findMediaUsage(publicId) });
});

// Delete an asset. Destroying it is irreversible and breaks every activity
// still pointing at the URL, so the reference check is not optional — `force`
// only exists so the admin can override it deliberately, having seen the list.
router.delete('/', async (req: Request, res: Response) => {
  const publicId = typeof req.query.publicId === 'string' ? req.query.publicId : '';
  const resourceType = req.query.resourceType === 'video' ? 'video' : 'image';
  const force = req.query.force === 'true';

  if (!publicId) {
    res.status(400).json({ error: 'publicId is required' });
    return;
  }
  // Only the folder admins upload into, and only its top level — never a
  // subfolder of machine output.
  const rest = publicId.startsWith(`${ADMIN_UPLOAD_FOLDER}/`) ? publicId.slice(ADMIN_UPLOAD_FOLDER.length + 1) : '';
  if (!rest || rest.includes('/')) {
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
    cache = null;
    res.json({ success: true });
  } catch (err) {
    console.error('[adminMedia] destroy failed:', cloudinaryError(err));
    res.status(502).json({ error: 'Delete failed' });
  }
});

export default router;
