// sw.js - Service Worker for offline support. Made by Claude AI, retrieved 2025.
// sw.js (classic worker)
importScripts('./cache-config.js');

// Resolve relative entries based on CACHE_BASE
const BASE = self.CACHE_BASE || new URL('.', self.location).pathname;
const CACHE_NAME = self.CACHE_NAME || 'app-cache-fallback';
const FILES_TO_CACHE = (self.FILES_TO_CACHE || []).map(p =>
  p.startsWith('./') ? BASE + p.slice(2) : p
);

// Install: precache with resilient loop
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of FILES_TO_CACHE) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res || !res.ok) throw new Error(`${res && res.status}`);
        await cache.put(url, res);
      } catch (e) {
        console.warn('[SW] Precache skipped:', url, e.message);
      }
    }
    await self.skipWaiting();
  })());
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

// Fetch: same-origin GET only, ignore extension/data/blob schemes
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (['chrome-extension:', 'chrome:', 'about:', 'file:', 'data:', 'blob:'].includes(url.protocol)) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  })());
});
