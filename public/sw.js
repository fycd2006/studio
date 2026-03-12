const CACHE_NAME = 'ntut-cd-camp-v1';
const STATIC_ASSETS = [
  '/',
  '/beep.wav',
  '/logo.png',
  '/favicon.ico',
  '/manifest.json',
  '/timer-worker.js'
];

// Install event: Pre-cache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installing and pre-caching static assets');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating, cleaning old caches');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event: Cache First for static assets, Network First for API/Firestore
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Firestore, Firebase Auth, and analytics requests (always network)
  if (url.hostname.includes('firestore') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google-analytics')) {
    return;
  }

  // Cache First strategy for static assets
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Return cached version but also fetch fresh in background
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(function() {}); // Ignore network errors for background refresh
        return cachedResponse;
      }
      
      // If not in cache, fetch from network and cache it
      return fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      }).catch(function() {
        // If both cache and network fail, return offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', function(event) {
  if (event.data) {
    var data = event.data.json();
    var options = {
      body: data.body,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Handle action button clicks
  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Focus existing window if available
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
