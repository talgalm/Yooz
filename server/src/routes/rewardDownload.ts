import { Router, Request, Response } from 'express';
import { Activity } from '../models';
import { cloudinaryAttachmentUrl } from '../utils/groupRewardConfig';

const router = Router();

// Public: download reward file (image/PDF) for group winner SMS link
router.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const token = req.params.token.trim();

  // ponytail: test-SMS links carry the cloudinary URL inline (test_<base64url>), so the test works before the activity is saved and has no downloadToken yet.
  if (token.startsWith('test_')) {
    try {
      const decoded = Buffer.from(token.slice(5), 'base64url').toString('utf8');
      if (!/^https:\/\/res\.cloudinary\.com\//.test(decoded)) {
        res.status(400).send('Invalid test link');
        return;
      }
      res.redirect(302, cloudinaryAttachmentUrl(decoded));
      return;
    } catch {
      res.status(400).send('Invalid test link');
      return;
    }
  }

  const activity = await Activity.findOne({ 'groupReward.downloadToken': token }).lean();
  const attachmentUrl = activity?.groupReward?.attachmentUrl;
  if (!activity || !attachmentUrl) {
    res.status(404).send('File not found');
    return;
  }

  const downloadUrl = cloudinaryAttachmentUrl(attachmentUrl);
  res.redirect(302, downloadUrl);
});

export default router;
