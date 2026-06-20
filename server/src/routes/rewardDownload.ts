import { Router, Request, Response } from 'express';
import { Activity } from '../models';

const router = Router();

function cloudinaryAttachmentUrl(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (url.includes('/upload/fl_attachment')) return url;
  return url.replace('/upload/', '/upload/fl_attachment/');
}

// Public: download reward file (image/PDF) for group winner SMS link
router.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const activity = await Activity.findOne({ 'groupReward.downloadToken': req.params.token.trim() }).lean();
  const attachmentUrl = activity?.groupReward?.attachmentUrl;
  if (!activity || !attachmentUrl) {
    res.status(404).send('File not found');
    return;
  }

  const downloadUrl = cloudinaryAttachmentUrl(attachmentUrl);
  res.redirect(302, downloadUrl);
});

export default router;
