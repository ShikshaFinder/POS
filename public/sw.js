/**
 * Service Worker for PWA
 * Handles offline caching and background sync
 */

const CACHE_NAME = 'pos-v1'
const RUNTIME_CACHE = 'pos-runtime-v1'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/pos',
  '/pos/billing',
  '/offline.html',
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // API requests - network first, no cache for mutations
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      // Don't cache POST/PUT/DELETE
      return
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clonedResponse)
          })
          return response
        })
        .catch(() => {
          return caches.match(request)
        })
    )
    return
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }

        const clonedResponse = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clonedResponse)
        })

        return response
      })
    }).catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html')
      }
    })
  )
})

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions())
  }
})

async function syncTransactions() {
  // The actual sync is handled by the SyncManager in the main app
  // This just notifies all clients to trigger sync
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' })
  })
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
