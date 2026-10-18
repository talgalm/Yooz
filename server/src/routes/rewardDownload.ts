import { Router, Request, Response } from 'express';
import sharp from 'sharp';
import { Activity } from '../models';
import { cloudinaryAttachmentUrl, israelDateToday } from '../utils/groupRewardConfig';
import { isMediaUrl, keyOfMediaUrl } from '../services/mediaStore';

const router = Router();

const DATE_FONT_PX = 70;
const DATE_BOTTOM_PX = 60;
const STAMPABLE = /^image\/(jpeg|png|webp)/;

async function stampDate(image: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  if (!width || !height) return image;
  const label = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="${height - DATE_BOTTOM_PX}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${DATE_FONT_PX}" font-weight="bold" fill="white">${israelDateToday()}</text></svg>`;
  return sharp(image).composite([{ input: Buffer.from(label) }]).toBuffer();
}

async function sendAsAttachment(res: Response, url: string): Promise<void> {
  const upstream = await fetch(url);
  if (!upstream.ok) {
    res.status(502).send('File unavailable');
    return;
  }
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const original = Buffer.from(await upstream.arrayBuffer());
  const body = STAMPABLE.test(contentType) ? await stampDate(original) : original;
  const key = keyOfMediaUrl(url) ?? 'download';
  const fileName = key.slice(key.lastIndexOf('/') + 1);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^\w.-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(body);
}

async function deliver(res: Response, url: string): Promise<void> {
  if (isMediaUrl(url)) {
    await sendAsAttachment(res, url);
    return;
  }
  res.redirect(302, cloudinaryAttachmentUrl(url));
}

router.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const token = req.params.token.trim();

  if (token.startsWith('test_')) {
    let decoded: string;
    try {
      decoded = Buffer.from(token.slice(5), 'base64url').toString('utf8');
    } catch {
      res.status(400).send('Invalid test link');
      return;
    }
    if (!/^https:\/\/res\.cloudinary\.com\//.test(decoded) && !isMediaUrl(decoded)) {
      res.status(400).send('Invalid test link');
      return;
    }
    await deliver(res, decoded);
    return;
  }

  const activity = await Activity.findOne({ 'groupReward.downloadToken': token }).lean();
  const attachmentUrl = activity?.groupReward?.attachmentUrl;
  if (!activity || !attachmentUrl) {
    res.status(404).send('File not found');
    return;
  }

  await deliver(res, attachmentUrl);
});

export default router;
