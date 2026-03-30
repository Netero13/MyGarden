// 🌿 Мій Садочок — Service Worker v4 (FCM)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'sadochok-v7';

firebase.initializeApp({
  apiKey: "AIzaSyCnQXcJm106-uoNETmrLWLetv2ed2NipS8",
  authDomain: "mygarden-29139.firebaseapp.com",
  projectId: "mygarden-29139",
  storageBucket: "mygarden-29139.firebasestorage.app",
  messagingSenderId: "137895417132",
  appId: "1:137895417132:web:771b1461cb8117d4dc4889"
});

const messaging = firebase.messaging();

// Background push
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || '🌿 Садочок', {
    body: body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
  });
});

// Cache
const PRECACHE_URLS = ['./garden-manager.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url).catch(()=>{}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const net = fetch(event.request).then(r => {
        if(r && r.status === 200 && r.type !== 'opaque'){
          caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
        }
        return r;
      }).catch(()=>{});
      return cached || net;
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
      if(list.length) return list[0].focus();
      return clients.openWindow('./garden-manager.html');
    })
  );
});
