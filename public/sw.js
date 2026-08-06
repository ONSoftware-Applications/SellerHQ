const CACHE_NAME = 'sellerhq-v4'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', () => {
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

// Explicit fetch handler that never calls respondWith — lets the browser
// handle every request normally via the network.
// This prevents the "respondWith received an error; returned response is null"
// crash caused by the old cached sw.js intercepting requests.
self.addEventListener('fetch', () => {})
