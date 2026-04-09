const CACHE_NAME = 'axios-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap',
  'js/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Solo aplicamos caché para GET y evitamos API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  // Estrategia Network-First (Intenta red, si falla usa caché)
  event.respondWith(
    fetch(event.request).then(response => {
      // Clona la respuesta y actualiza el caché en segundo plano
      let resClone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, resClone);
      });
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Limpieza de cachés viejos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
