// 🌿 Мій Садочок — Service Worker
const CACHE_NAME = 'sadochok-v1';

// Файли які кешуємо при встановленні
const PRECACHE_URLS = [
  './garden-manager.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// ── Встановлення: кешуємо основні файли ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching files');
      // Кешуємо по одному — щоб не падало якщо один не доступний
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(e => console.warn('[SW] Could not cache:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Активація: видаляємо старий кеш ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first, fallback to network ──
self.addEventListener('fetch', event => {
  // Не чіпаємо POST і не-GET запити
  if (event.request.method !== 'GET') return;

  // Не чіпаємо chrome-extension та інші схеми
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Є в кеші — повертаємо, але фоново оновлюємо
        const fetchPromise = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
            }
            return response;
          })
          .catch(() => {}); // мовчки ігноруємо помилки мережі
        
        return cached;
      }

      // Немає в кеші — йдемо в мережу і кешуємо
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        
        // Не кешуємо opaque responses (cross-origin без CORS) — крім шрифтів
        if (response.type === 'opaque') return response;

        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // Офлайн і немає кешу — повертаємо garden-manager як fallback
        if (event.request.destination === 'document') {
          return caches.match('./garden-manager.html');
        }
      });
    })
  );
});

// ── Push notifications (підготовка на майбутнє) ──
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || '🌿 Садочок', {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  });
});
