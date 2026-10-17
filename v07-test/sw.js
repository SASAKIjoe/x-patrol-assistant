'use strict';

// Use a dedicated prefix: the legacy root worker deletes x-patrol-* caches.
// Bump this version whenever a runtime asset changes before deployment.
const CACHE_PREFIX = 'swb07-shell-';
const CACHE_NAME = `${CACHE_PREFIX}20261016-rc2`;
const APP_ROOT = new URL(self.registration.scope);
const INDEX_URL = new URL('index.html', APP_ROOT).href;
const REQUIRED_FILES = Object.freeze([
  'index.html', 'style.css', 'app.mjs', 'core.mjs', 'storage.mjs',
  'legacy-v05.mjs', 'manifest.webmanifest', 'sw.js', 'icon.svg',
  'icon192.png', 'icon512.png', 'maskable512.png'
]);
const ASSET_URLS = REQUIRED_FILES.map(file => new URL(file, APP_ROOT).href);
const ASSET_SET = new Set(ASSET_URLS);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // A missing dependency rejects installation; an incomplete shell is never
    // activated. No shared data, external request, or backup enters this cache.
    const responses = await Promise.all(ASSET_URLS.map(async url => {
      const response = await fetch(new Request(url, {
        cache: 'reload', credentials: 'same-origin'
      }));
      if (!response.ok || response.type === 'opaque' || response.redirected) {
        throw new Error(`V07 precache failed: ${new URL(url).pathname} (${response.status})`);
      }
      // Drain each response immediately. Holding unread bodies while waiting
      // for every fetch can exhaust Chromium's concurrent fetch connections.
      const body = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      headers.delete('content-encoding');
      headers.delete('content-length');
      return new Response(body, {
        status: response.status, statusText: response.statusText, headers
      });
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSET_URLS.map((url, index) => cache.put(url, responses[index])));
    // Keep existing windows on their complete release until they close, or
    // until the foreground explicitly requests an update via SKIP_WAITING.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  const isEntry = url.pathname === APP_ROOT.pathname || url.pathname === new URL(INDEX_URL).pathname;
  if (request.mode === 'navigate' && isEntry) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // The foreground retains and consumes title/text/url. Serve a clean
      // shell; never use incoming query data as cache key or network URL.
      const cached = await cache.match(INDEX_URL);
      return cached || fetch(new Request(INDEX_URL, {
        cache: 'no-store', credentials: 'same-origin'
      }));
    })());
    return;
  }
  // Query-bearing assets, unknown routes, external SNS links, and backup
  // files bypass this worker. Only exact, query-free release assets match.
  if (url.search || !ASSET_SET.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(url.href)) || fetch(request);
  })());
});
