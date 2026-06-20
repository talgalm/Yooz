import type { Request } from 'express';

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|TelegramBot|Googlebot|bingbot/i;

export function isSocialCrawler(req: Request): boolean {
  const ua = req.headers['user-agent'] || '';
  return CRAWLER_UA.test(ua);
}

export function requestOrigin(req: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const origin = req.get('origin');
  if (origin && /^https?:\/\/[^/]+$/i.test(origin)) return origin;
  const host = req.get('host');
  if (!host) return 'http://localhost';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${host}`;
}

export function buildPlayOgHtml(opts: {
  pageUrl: string;
  title: string;
  description: string;
  imageUrl: string;
}): string {
  const { pageUrl, title, description, imageUrl } = opts;
  const fbAppId = process.env.FACEBOOK_APP_ID || '';
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:locale" content="he_IL" />
  ${fbAppId ? `<meta property="fb:app_id" content="${esc(fbAppId)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <title>${esc(title)}</title>
</head>
<body>
  <p><a href="${esc(pageUrl)}">${esc(title)}</a></p>
</body>
</html>`;
}
