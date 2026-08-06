// Self-destructing service worker — installs, clears all caches, then unregisters itself.
// This removes any old cached service worker data that causes Safari errors.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister()),
  )
})

// No fetch handler — every request goes directly to the network.
