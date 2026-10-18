const CACHE = 'yooz-media-v2';

function isMediaRequest(url) {
  if (url.origin === self.location.origin && url.pathname.startsWith('/images/')) return true;
  if (url.hostname.endsWith('.cloudfront.net')) return !/\.(mp4|webm|mov|ogg|ogv|mp3|wav|weba|m4a)$/i.test(url.pathname);
  return false;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.headers.has('range') || !isMediaRequest(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    const fetchAndCache = () => fetch(event.request).then((res) => {
      if (res.status === 200) void cache.put(event.request, res.clone());
      return res;
    });

    if (cached) {
      if (url.origin === self.location.origin) void fetchAndCache().catch(() => {});
      return cached;
    }

    try {
      return await fetchAndCache();
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
