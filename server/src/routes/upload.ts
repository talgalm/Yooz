import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { authenticateAdmin } from '../middleware/adminAuth';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { resolveFolder } from '../utils/mediaFolders';

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.post('/', authenticateAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

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
  if (!ALLOWED_MIMETYPES.has(req.file.mimetype)) {
    res.status(400).json({ error: `File type not allowed: ${req.file.mimetype}` });
    return;
  }

  try {
    const isDocument =
      req.file.mimetype === 'application/pdf' ||
      req.file.mimetype.startsWith('application/vnd.') ||
      req.file.mimetype === 'application/msword' ||
      req.file.mimetype === 'text/plain';
    const isVideo = req.file.mimetype.startsWith('video/');
    const isAudio = req.file.mimetype.startsWith('audio/');
    const resourceType = isDocument ? 'raw' : isVideo || isAudio ? 'video' : 'image';

    const folder = resolveFolder(req.body?.folder) ?? 'yooz';

    const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string; format: string; bytes: number }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string; resource_type: string; format: string; bytes: number });
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      size: result.bytes,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
