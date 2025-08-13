const CACHE_NAME = 'calculator-v9';

// Формируем URL-ы для кэша относительно scope SW, чтобы работало из подпапки
const scope = self.registration.scope;
const urlsToCache = [
  'index.html',
  'style.css',
  'app.js',
  'pwa.js',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
].map(u => u.startsWith('http') ? u : new URL(u, scope).toString());

// Установка SW и кэширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.map(name => name !== CACHE_NAME && caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// Сеть-сначала, с записью в кэш; офлайн — кэш; навигация — fallback на index.html
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Для переходов (SPA/страница) — отдать index.html
        if (event.request.mode === 'navigate') {
          return caches.match(new URL('index.html', scope).toString());
        }
      })
  );
});
