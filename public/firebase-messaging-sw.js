// public/firebase-messaging-sw.js
// UN SOLO Service Worker: FCM + Workbox precache/runtime.
// Niente skipWaiting automatico: il nuovo SW attende. L'attivazione immediata
// avviene SOLO su richiesta esplicita dell'utente (banner "nuova versione"
// nell'app → postMessage 'SKIP_WAITING').

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDuygauGnMqxL8Rf6QvyVgnRTwDbZ20VbI',
  authDomain: 'riservapp-6054c.firebaseapp.com',
  projectId: 'riservapp-6054c',
  storageBucket: 'riservapp-6054c.firebasestorage.app',
  messagingSenderId: '62159000134',
  appId: '1:62159000134:web:2e87a9ace109c58c45f047',
});

const messaging = firebase.messaging();

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

workbox.core.clientsClaim();
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

workbox.routing.registerRoute(
  ({ url }) => url.hostname.includes('firebasestorage.googleapis.com') || url.hostname.includes('firebasestorage.app'),
  new workbox.strategies.CacheFirst({
    cacheName: 'photos',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// I messaggi arrivano DATA-ONLY (title/body/priority in payload.data): la notifica
// la costruiamo solo qui, così non ci sono doppioni con l'auto-display dell'SDK.
// Il fallback su payload.notification copre la transizione da vecchie Functions.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || payload.notification?.title || 'Riserva Tuenno';
  const body = payload.data?.body || payload.notification?.body || '';
  const isAlert = payload.data?.priority === 'high';
  self.registration.showNotification(title, {
    body,
    icon: '/logo_tuenno_ui.png',
    vibrate: isAlert ? [200, 100, 200, 100, 200] : [100],
    requireInteraction: isAlert,
    data: { url: 'https://riservatuenno.web.app' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://riservatuenno.web.app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        return clientList[0].focus();
      }
      return clients.openWindow(url);
    })
  );
});
