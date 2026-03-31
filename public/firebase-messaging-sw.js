importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDuygauGnMqxL8Rf6QvyVgnRTwDbZ20VbI',
  authDomain: 'riservapp-6054c.firebaseapp.com',
  projectId: 'riservapp-6054c',
  storageBucket: 'riservapp-6054c.firebasestorage.app',
  messagingSenderId: '62159000134',
  appId: '1:62159000134:web:2e87a9ace109c58c45f047',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Riserva Tuenno';
  const body = payload.notification?.body || '';
  const isAlert = payload.data?.priority === 'high';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    vibrate: isAlert ? [200, 100, 200, 100, 200] : [100],
    requireInteraction: isAlert,
  });
});
