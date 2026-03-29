import { Router, Request, Response } from 'express';

const router = Router();

const OREF_ALARMS_HISTORY_URL = 'https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1';
const REQUEST_TIMEOUT_MS = 10_000;

router.get('/history', async (_req: Request, res: Response) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(OREF_ALARMS_HISTORY_URL, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; YoozServer/1.0)',
      },
      signal: controller.signal,
    });

    if (!upstreamRes.ok) {
      console.error(`Oref alarms history error: ${upstreamRes.status} ${upstreamRes.statusText}`);
      res.status(502).json({ error: 'Failed to fetch alarms history' });
      return;
    }

    const payload = await upstreamRes.text();
    const contentType = upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8';
    const cacheControl = upstreamRes.headers.get('cache-control');
    const lastModified = upstreamRes.headers.get('last-modified');
    const expires = upstreamRes.headers.get('expires');

    res.setHeader('Content-Type', contentType);
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);
    if (lastModified) res.setHeader('Last-Modified', lastModified);
    if (expires) res.setHeader('Expires', expires);

    res.send(payload);
  } catch (err) {
    console.error('Oref alarms history proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch alarms history' });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
