const CACHE = 'yooz-media-v1';

function isMediaRequest(url) {
  if (url.origin === self.location.origin && url.pathname.startsWith('/images/')) return true;
  if (url.hostname === 'res.cloudinary.com') return !url.pathname.includes('/video/upload/');
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
