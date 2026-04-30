const CACHE_NAME = 'meridiano-pos-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first strategy (always get fresh data from Supabase)
self.addEventListener('fetch', (event) => {
  // Skip non-GET and Supabase/API requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache API/Supabase calls
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
