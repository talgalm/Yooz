import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { authenticateAdmin } from '../middleware/adminAuth';
import { resolveFolder } from '../utils/mediaFolders';
import { extensionForUpload, newMediaKey, publicIdOf, resourceTypeOf } from '../utils/mediaKeys';
import { isMediaConfigured, putMedia, storePosterFor } from '../services/mediaStore';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const MAX_IMAGE_EDGE = 2000;
const RESIZABLE_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

async function fitImage(buffer: Buffer, mimetype: string): Promise<Buffer> {
  if (!RESIZABLE_IMAGES.has(mimetype)) return buffer;
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
    .toBuffer();
}

router.post('/', authenticateAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!isMediaConfigured()) {
    res.status(500).json({ error: 'Media storage not configured. Add MEDIA_BUCKET and MEDIA_CDN_URL to .env' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  if (!ALLOWED_MIMETYPES.has(req.file.mimetype)) {
    res.status(400).json({ error: `File type not allowed: ${req.file.mimetype}` });
    return;
  }

  try {
    const folder = resolveFolder(req.body?.folder) ?? 'yooz';
    const key = newMediaKey(folder, req.file.originalname, extensionForUpload(req.file.mimetype, req.file.originalname));
    const body = await fitImage(req.file.buffer, req.file.mimetype);
    const stored = await putMedia(key, body, req.file.mimetype);
    if (req.file.mimetype.startsWith('video/')) await storePosterFor(key, stored.url);

    res.json({
      url: stored.url,
      publicId: publicIdOf(key),
      resourceType: resourceTypeOf(key),
      format: key.slice(key.lastIndexOf('.') + 1),
      size: stored.bytes,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
