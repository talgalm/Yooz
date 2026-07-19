import { Router, Request, Response } from 'express';
import { Activity } from '../models';
import { cloudinaryAttachmentUrl, cloudinaryDisplayUrl } from '../utils/groupRewardConfig';

const router = Router();

function renderSharePage(imageUrl: string, downloadUrl: string, pageUrl: string): string {
  const displayUrl = cloudinaryDisplayUrl(imageUrl);
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>הקופון שלכם</title>
<meta property="og:title" content="זכינו! קיבלנו קופון">
<meta property="og:description" content="לחצו לצפייה בקופון">
<meta property="og:image" content="${displayUrl}">
<meta property="og:url" content="${pageUrl}">
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #f5f3ff; display: flex; flex-direction: column; align-items: center; padding: 24px 16px; min-height: 100vh; box-sizing: border-box; }
  img { max-width: min(440px, 100%); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.15); }
  .btns { display: flex; gap: 12px; margin-top: 20px; width: min(440px, 100%); }
  a, button { flex: 1; padding: 14px 0; border-radius: 10px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; border: none; cursor: pointer; font-family: inherit; }
  #share { background: #6c5ce7; color: #fff; }
  #dl { background: #fff; color: #6c5ce7; border: 2px solid #6c5ce7; box-sizing: border-box; }
</style>
</head>
<body>
<img src="${displayUrl}" alt="קופון">
<div class="btns">
  <button id="share">שיתוף</button>
  <a id="dl" href="${downloadUrl}">הורדה</a>
</div>
<script>
document.getElementById('share').onclick = async () => {
  try {
    const blob = await fetch(${JSON.stringify(displayUrl)}).then((r) => r.blob());
    const file = new File([blob], 'coupon.jpg', { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    if (navigator.share) { await navigator.share({ url: location.href }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  location.href = 'https://wa.me/?text=' + encodeURIComponent(location.href);
};
</script>
</body>
</html>`;
}

function pageUrl(req: Request): string {
  const base = (process.env.APP_URL || process.env.SITE_URL)?.replace(/\/$/, '')
    || `${req.protocol}://${req.get('host')}`;
  return `${base}${req.originalUrl.split('?')[0]}`;
}

// Public: reward file (image/PDF) for group winner SMS link.
// Direct download by default; share landing page when sharePageEnabled (?dl=1 forces download).
router.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const token = req.params.token.trim();
  const forceDownload = req.query.dl === '1';

  // ponytail: test-SMS links carry the cloudinary URL inline (test_<base64url> / tests_<base64url> with share page), so the test works before the activity is saved and has no downloadToken yet.
  const testMatch = /^(tests?)_(.+)$/.exec(token);
  if (testMatch) {
    try {
      const decoded = Buffer.from(testMatch[2], 'base64url').toString('utf8');
      if (!/^https:\/\/res\.cloudinary\.com\//.test(decoded)) {
        res.status(400).send('Invalid test link');
        return;
      }
      const sharePage = testMatch[1] === 'tests' && !/\.pdf(\?|$)/i.test(decoded);
      if (sharePage && !forceDownload) {
        res.send(renderSharePage(decoded, `${pageUrl(req)}?dl=1`, pageUrl(req)));
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

  const sharePage = !!activity.groupReward?.sharePageEnabled
    && activity.groupReward?.attachmentType !== 'pdf';
  if (sharePage && !forceDownload) {
    res.send(renderSharePage(attachmentUrl, `${pageUrl(req)}?dl=1`, pageUrl(req)));
    return;
  }

  res.redirect(302, cloudinaryAttachmentUrl(attachmentUrl));
});

export default router;
