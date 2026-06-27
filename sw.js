// 4D Cosmetics service worker.
//
// ── HOW UPDATES REACH CUSTOMERS ───────────────────────────────────────────
// Bump VERSION below on every deploy. Because this file's bytes change, the
// browser detects a new service worker, installs it, and the site shows an
// "Update available" banner (see assets/js/config.js). The customer taps
// Refresh and gets the new version. Online visitors are always served fresh
// (network-first); the cache is only used as an offline fallback.
const VERSION = '2026.06.28-1';
const RUNTIME = 'runtime-' + VERSION; // HTML / JS / CSS / JSON (network-first)
const IMAGES = 'image-cache-v1';      // product images (cache-first, long-lived)

self.addEventListener('install', () => {
  // Intentionally do NOT skipWaiting here. The new worker waits so the page can
  // offer the "Update available" banner; skipWaiting runs when the user accepts.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([RUNTIME, IMAGES]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Leave cross-origin requests (Google Fonts, Font Awesome CDN, WhatsApp, …)
  // entirely alone.
  if (url.origin !== self.location.origin) return;

  // Images: cache-first for speed (they rarely change).
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMAGES).then((cache) =>
        cache.match(req).then((hit) =>
          hit || fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        )
      )
    );
    return;
  }

  // Everything else same-origin (page navigations, JS, CSS, JSON):
  // NETWORK-FIRST — always try the network first so online visitors get the
  // latest code; only fall back to the cache when the network is unavailable.
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      // Cache a copy for offline use. For navigations we cache even the
      // GitHub-Pages 404 SPA shell so /p/ and /c/ pages work offline too.
      if (res && (res.ok || req.mode === 'navigate')) {
        const cache = await caches.open(RUNTIME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const home = (await caches.match('/index.html')) || (await caches.match('/'));
        if (home) return home;
      }
      throw err;
    }
  })());
});
