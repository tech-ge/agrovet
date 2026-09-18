/* Karen Agrovet — Service Worker
 * Strategy:
 *   - App shell (HTML/CSS/JS/icons): Stale-While-Revalidate
 *   - Static assets (images/fonts): Cache-First
 *   - API GET requests: Network-First with cache fallback (offline read)
 *   - API mutations (POST/PUT/PATCH/DELETE): never cached
 *   - Navigation requests: Network-First falling back to cached shell
 */

const VERSION = 'v1.0.0';
const SHELL_CACHE = `agrovet-shell-${VERSION}`;
const ASSETS_CACHE = `agrovet-assets-${VERSION}`;
const API_CACHE = `agrovet-api-${VERSION}`;

// Files required for offline app shell
const SHELL_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/products.html',
  '/sales.html',
  '/receipts.html',
  '/reports.html',
  '/offline.html',
  '/manifest.json',
  '/css/style.css',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/products.css',
  '/css/sales.css',
  '/css/receipts.css',
  '/css/reports.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/icons.js',
  '/js/sw-register.js',
  '/js/dashboard.js',
  '/js/products.js',
  '/js/sales.js',
  '/js/paystack.js',
  '/js/receipts.js',
  '/js/reports.js',
];

// ---------- Install ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // addAll fails if any file 404s — use individual adds to be resilient
        Promise.all(
          SHELL_FILES.map((url) =>
            cache.add(url).catch((err) => console.warn('[SW] skip cache', url, err.message))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ---------- Activate ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![SHELL_CACHE, ASSETS_CACHE, API_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------- Fetch ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip Paystack / external payment iframes
  if (url.pathname.startsWith('/api/payments')) return;

  // API requests
  if (url.pathname.startsWith('/api/')) {
    // Never cache mutations
    if (request.method !== 'GET') return;

    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }

  // Uploads (product images) — cache-first, long-lived
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Icons / images / fonts — cache-first
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // CSS / JS — stale-while-revalidate
  if (/\.(css|js)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // HTML navigation requests — network-first, fall back to cache, then offline
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Default: try network, fallback cache
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ---------- Strategies ----------

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName, timeoutMs = 0) {
  const cache = await caches.open(cacheName);
  try {
    const fetchPromise = fetch(request);
    const response = timeoutMs
      ? await Promise.race([
          fetchPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ])
      : await fetchPromise;

    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ success: false, message: 'You are offline', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    // Optionally update shell cache with fresh HTML
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match('/offline.html');
    if (offline) return offline;
    return new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
  }
}

// ---------- Message channel (manual updates) ----------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
