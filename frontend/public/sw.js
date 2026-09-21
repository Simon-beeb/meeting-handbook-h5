const CACHE_NAME = 'meeting-handbook-h5-v1'
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isApi = url.pathname.startsWith('/api/')

  if (!isSameOrigin || isApi) {
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const cloned = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, cloned))
        return response
      })
    })
  )
})
