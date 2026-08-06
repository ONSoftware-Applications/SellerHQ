const CACHE_NAME = 'sellerhq-v3'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// No fetch handler: every request goes straight to the network.
// This prevents stale cached JS chunks from breaking pages on Safari
// (the previous version cached failed responses, which corrupted pages).
