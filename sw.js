/**
 * Service worker for Attendance Register.
 *
 * Strategy: cache-first for the app shell, so the app opens instantly and
 * works with no internet at all. A background fetch refreshes the cache
 * when there IS a connection, so you get updates without ever being
 * blocked by a dead network in a classroom basement.
 *
 * IMPORTANT: bump CACHE_VERSION whenever you change index.html,
 * otherwise phones will keep serving the old cached copy.
 */

var CACHE_VERSION = "attendance-v15";

var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // addAll fails the whole install if any one file 404s, so add
      // them individually and tolerate misses.
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () { return null; });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Only handle same-origin GETs. Never touch wa.me links or anything external.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return cached || caches.match('./index.html');
      });

      // Serve cache immediately if we have it; refresh in the background.
      return cached || network;
    })
  );
});

// Lets the page trigger an immediate update instead of waiting for a restart.
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
