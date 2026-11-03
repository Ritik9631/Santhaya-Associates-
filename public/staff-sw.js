/**
 * Santhaya Associates — Santhaya Staff Dedicated Service Worker
 * File: public/staff-sw.js
 *
 * SAFETY & SECURITY SPECIFICATION:
 * 1. STRICT ONLINE-ONLY ERP: No offline quotation creation, invoice editing, or database sync.
 * 2. ZERO PRIVATE DATA CACHING: Never caches /staff/* HTML, Supabase auth sessions, APIs,
 *    customer records, quotations, invoices, payments, audit logs, or PDF downloads.
 * 3. NETWORK-ONLY STRATEGY: All ERP operational requests bypass CacheStorage completely.
 * 4. SECURE OFFLINE FALLBACK: Returns a static /staff-offline.html message with zero data exposure
 *    when network connectivity is interrupted during navigation.
 * 5. SAFE PURGE: Erases legacy cache on activation and upon sign-out CLEAR_CACHES message.
 */

const CACHE_NAME = 'santhaya-staff-static-v1';

// Static public shell assets ONLY (Zero private data)
const STATIC_ASSETS = [
  '/staff-offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/santhaya-symbol.png',
  '/staff-manifest.json'
];

// 1. Install Event: Pre-cache static public offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Santhaya Staff SW] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strict Network-Only for Private ERP Data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET requests (POST, PUT, DELETE, PATCH): Always strictly network only
  if (request.method !== 'GET') {
    return;
  }

  // A. Static Asset Cache Strategy (Cache-first for static icons/offline page ONLY)
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).catch(() => caches.match('/staff-offline.html'));
      })
    );
    return;
  }

  // B. Private ERP Requests (/staff/*, /api/*, Supabase Auth, PDF generation):
  // STRICT NETWORK ONLY — Never store in CacheStorage!
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Return live network response directly without caching
        return networkResponse;
      })
      .catch((error) => {
        // Network failure (device offline or disconnected)
        // If navigation request (user opening / refreshing / navigating in PWA window):
        if (request.mode === 'navigate' || request.destination === 'document') {
          return caches.match('/staff-offline.html');
        }

        // For background fetch / API requests: return 503 Service Unavailable JSON
        return new Response(
          JSON.stringify({
            error: 'NETWORK_DISCONNECTED',
            message: 'Santhaya Staff is currently offline. Please reconnect to access ERP services.'
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store'
            }
          }
        );
      })
  );
});

// 4. Message Event: Handle staff sign-out cache purge & updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
    );
  } else if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

